import { createHash, randomBytes } from 'node:crypto';

import { type Session } from 'next-auth';
import { type IncomingHttpHeaders } from 'node:http';

import { type PrismaClient, type User } from '@prisma/client';

/**
 * API-key authentication helpers for the public REST API (`/api/v1`).
 *
 * Keys are shown to the user exactly once at creation. Only a SHA-256 hash of
 * the key is persisted, so a leaked database never exposes usable credentials.
 */

export const API_KEY_PREFIX = 'spro_';

/** How long the plaintext prefix shown in listings is (e.g. `spro_A1b2c3`). */
const PARTIAL_KEY_LENGTH = API_KEY_PREFIX.length + 6;

/** Only refresh `lastUsedAt` if it is older than this, to avoid a write per request. */
const LAST_USED_THROTTLE_MS = 60 * 1000;

export interface GeneratedApiKey {
  /** The full plaintext key — returned to the caller once and never stored. */
  key: string;
  /** SHA-256 hex digest persisted as `ApiKey.hashedKey`. */
  hashedKey: string;
  /** Non-secret prefix persisted for display, e.g. `spro_A1b2c3`. */
  partialKey: string;
}

/** SHA-256 hex digest of a plaintext key. Deterministic — used for storage and lookup. */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Mint a new random API key together with its hash and display prefix. */
export function generateApiKey(): GeneratedApiKey {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

  return {
    key,
    hashedKey: hashApiKey(key),
    partialKey: key.slice(0, PARTIAL_KEY_LENGTH),
  };
}

/**
 * Extract a bearer token from request headers. Accepts `Authorization: Bearer
 * <key>` (preferred) or the `X-API-Key: <key>` header. Returns null when absent.
 */
export function parseApiKeyFromHeaders(headers: IncomingHttpHeaders): string | null {
  const authorization = headers.authorization;
  if (authorization) {
    const [scheme, token] = authorization.split(' ');
    if ('bearer' === scheme?.toLowerCase() && token) {
      return token.trim();
    }
  }

  const apiKeyHeader = headers['x-api-key'];
  if ('string' === typeof apiKeyHeader && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }

  return null;
}

/** True when a key with the given expiry is no longer valid at `now`. */
export function isApiKeyExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  return null !== expiresAt && expiresAt.getTime() <= now.getTime();
}

/**
 * Look up the user owning a plaintext API key, or null when the key is unknown
 * or expired. Refreshes `lastUsedAt` at most once per throttle window.
 */
export async function resolveApiKeyUser(
  db: PrismaClient,
  rawKey: string | null,
  now: Date = new Date(),
): Promise<User | null> {
  if (!rawKey) {
    return null;
  }

  const record = await db.apiKey.findUnique({
    where: { hashedKey: hashApiKey(rawKey) },
    include: { user: true },
  });

  if (!record || isApiKeyExpired(record.expiresAt, now)) {
    return null;
  }

  const isStale =
    !record.lastUsedAt || now.getTime() - record.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS;
  if (isStale) {
    await db.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: now } })
      .catch(() => null);
  }

  return record.user;
}

/**
 * Build a next-auth session user from a database user, matching the shape the
 * cookie `session` callback produces in `~/server/auth`, so procedures behave
 * identically whether authenticated by cookie or API key.
 */
export function toSessionUser(user: User): Session['user'] {
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    image: user.image ?? '',
    currency: user.currency,
    defaultCurrency: user.defaultCurrency,
    obapiProviderId: user.obapiProviderId ?? undefined,
    bankingId: user.bankingId ?? undefined,
    preferredLanguage: user.preferredLanguage,
    hiddenFriendIds: user.hiddenFriendIds,
  };
}
