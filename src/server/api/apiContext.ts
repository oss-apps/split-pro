import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type Session } from 'next-auth';

import { db } from '~/server/db';

import { parseApiKeyFromHeaders, resolveApiKeyUser, toSessionUser } from './apiKey';

/**
 * Public REST API context (`/api/v1`). Authenticates via API key instead of the
 * cookie session used by the app's `/api/trpc` handler, but returns the same
 * context shape (`{ session, db }`) so procedures are shared between them.
 */
export const createApiContext = async (opts: CreateNextContextOptions) => {
  const rawKey = parseApiKeyFromHeaders(opts.req.headers);
  const user = await resolveApiKeyUser(db, rawKey);

  const session: Session | null = user
    ? {
        user: toSessionUser(user),
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }
    : null;

  return { session, db };
};
