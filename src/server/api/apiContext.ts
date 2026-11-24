import { type CreateNextContextOptions } from '@trpc/server/adapters/next';
import { type Session } from 'next-auth';

import { db } from '~/server/db';
import { TIME_ZONE_HEADER } from '~/utils/timeZone';

import { parseApiKeyFromHeaders, resolveApiKeyUser, toSessionUser } from './apiKey';
import { createInnerTRPCContext } from './trpc';

/** Fallback for the synthetic session expiry when the key never expires. */
const NON_EXPIRING_SESSION_MS = 100 * 365 * 24 * 60 * 60 * 1000; // 100 years

/**
 * Public REST API context (`/api/v1`). Authenticates via API key instead of the
 * cookie session used by the app's `/api/trpc` handler, but builds the same
 * inner context so procedures are shared between them.
 *
 * `session.expires` is synthetic: it mirrors the API key's expiry (which is
 * configurable when the key is created) so nothing downstream caches an API-key
 * session beyond the key's lifetime.
 */
export const createApiContext = async (opts: CreateNextContextOptions) => {
  const rawKey = parseApiKeyFromHeaders(opts.req.headers);
  const resolved = await resolveApiKeyUser(db, rawKey);

  const session: Session | null = resolved
    ? {
        user: toSessionUser(resolved.user),
        expires: (
          resolved.expiresAt ?? new Date(Date.now() + NON_EXPIRING_SESSION_MS)
        ).toISOString(),
      }
    : null;

  return createInnerTRPCContext({ session, timeZone: opts.req.headers[TIME_ZONE_HEADER] });
};
