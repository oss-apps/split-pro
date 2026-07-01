/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { TRPCError, initTRPC } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type Session } from 'next-auth';
import superjson from 'superjson';
import { ZodError, z } from 'zod';
import { OpenApiMeta } from 'trpc-to-openapi';
import { createHash } from 'crypto';

import { getServerAuthSession } from '~/server/auth';
import { db } from '~/server/db';

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */

interface CreateContextOptions {
  session: Session | null;
}

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
export const createInnerTRPCContext = (opts: CreateContextOptions) => ({
  session: opts.session,
  db,
});

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    session,
  });
};

/**
 * Creates context for OpenAPI REST requests. Authenticates via X-API-Key header.
 */
export const createOpenApiContext = async (opts: CreateNextContextOptions & { info?: unknown }) => {
  const { req, res } = opts;

  const apiKey = req.headers['x-api-key'];
  if (apiKey && 'string' === typeof apiKey) {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const keyRecord = await db.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (keyRecord) {
      const shouldUpdateLastUsed =
        !keyRecord.lastUsedAt ||
        new Date().getTime() - keyRecord.lastUsedAt.getTime() > 5 * 60 * 1000;

      if (shouldUpdateLastUsed) {
        await db.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsedAt: new Date() },
        });
      }

      return createInnerTRPCContext({
        session: {
          user: {
            id: keyRecord.user.id,
            name: keyRecord.user.name,
            email: keyRecord.user.email,
            image: keyRecord.user.image,
            currency: keyRecord.user.currency,
            defaultCurrency: keyRecord.user.defaultCurrency,
            obapiProviderId: keyRecord.user.obapiProviderId,
            bankingId: keyRecord.user.bankingId,
            preferredLanguage: keyRecord.user.preferredLanguage,
            hiddenFriendIds: keyRecord.user.hiddenFriendIds,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        } as Session,
      });
    }
  }

  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing API key' });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC
  .context<typeof createTRPCContext>()
  .meta<OpenApiMeta>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
  });

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const groupProcedure = protectedProcedure
  .input(z.object({ groupId: z.number() }))
  .use(async ({ ctx, input: { groupId }, next }) => {
    const groupUser = await ctx.db.groupUser.findFirst({
      where: {
        groupId,
        userId: ctx.session.user.id,
      },
    });

    if (!groupUser) {
      throw new TRPCError({ message: 'Not a group member', code: 'FORBIDDEN' });
    }

    return next({ ctx: { ...ctx } });
  });
