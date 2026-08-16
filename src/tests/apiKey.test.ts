import { type PrismaClient, type User } from '@prisma/client';

import {
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  isApiKeyExpired,
  parseApiKeyFromHeaders,
  resolveApiKeyUser,
  toSessionUser,
} from '../server/api/apiKey';

describe('hashApiKey', () => {
  it('is deterministic and returns a 64-char sha256 hex digest', () => {
    const a = hashApiKey('spro_test');
    const b = hashApiKey('spro_test');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different digests for different keys', () => {
    expect(hashApiKey('spro_a')).not.toBe(hashApiKey('spro_b'));
  });
});

describe('generateApiKey', () => {
  it('mints a prefixed key whose hash and partial match the plaintext', () => {
    const { key, hashedKey, partialKey } = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(hashedKey).toBe(hashApiKey(key));
    expect(key.startsWith(partialKey)).toBe(true);
    expect(partialKey).toHaveLength(API_KEY_PREFIX.length + 6);
  });

  it('does not store the plaintext in the hash', () => {
    const { key, hashedKey } = generateApiKey();
    expect(hashedKey).not.toContain(key);
  });

  it('mints unique keys', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });
});

describe('parseApiKeyFromHeaders', () => {
  it('reads Authorization: Bearer (case-insensitive scheme)', () => {
    expect(parseApiKeyFromHeaders({ authorization: 'Bearer spro_abc' })).toBe('spro_abc');
    expect(parseApiKeyFromHeaders({ authorization: 'bearer spro_abc' })).toBe('spro_abc');
  });

  it('reads X-API-Key', () => {
    expect(parseApiKeyFromHeaders({ 'x-api-key': 'spro_xyz' })).toBe('spro_xyz');
  });

  it('returns null when absent or malformed', () => {
    expect(parseApiKeyFromHeaders({})).toBeNull();
    expect(parseApiKeyFromHeaders({ authorization: 'Basic abc' })).toBeNull();
    expect(parseApiKeyFromHeaders({ authorization: 'Bearer ' })).toBeNull();
  });
});

describe('isApiKeyExpired', () => {
  const now = new Date('2026-07-15T00:00:00Z');

  it('treats a null expiry as never expiring', () => {
    expect(isApiKeyExpired(null, now)).toBe(false);
  });

  it('is expired at or after the expiry instant', () => {
    expect(isApiKeyExpired(new Date('2026-07-14T23:59:59Z'), now)).toBe(true);
    expect(isApiKeyExpired(new Date('2026-07-15T00:00:00Z'), now)).toBe(true);
  });

  it('is valid before the expiry instant', () => {
    expect(isApiKeyExpired(new Date('2026-07-15T00:00:01Z'), now)).toBe(false);
  });
});

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 1,
    name: 'Kush',
    email: 'kush@example.com',
    image: null,
    currency: 'USD',
    defaultCurrency: null,
    preferredLanguage: '',
    bankingId: null,
    obapiProviderId: null,
    hiddenFriendIds: [],
    emailVerified: null,
    ...over,
  }) as User;

const makeDb = (record: unknown) => {
  const update = jest.fn().mockResolvedValue({});
  const findUnique = jest.fn().mockResolvedValue(record);
  return {
    db: { apiKey: { findUnique, update } } as unknown as PrismaClient,
    findUnique,
    update,
  };
};

describe('resolveApiKeyUser', () => {
  const now = new Date('2026-07-15T12:00:00Z');

  it('returns null for a missing raw key without touching the db', async () => {
    const { db, findUnique } = makeDb(null);
    expect(await resolveApiKeyUser(db, null, now)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns null for an unknown key', async () => {
    const { db } = makeDb(null);
    expect(await resolveApiKeyUser(db, 'spro_unknown', now)).toBeNull();
  });

  it('returns null for an expired key', async () => {
    const { db } = makeDb({
      id: 'k1',
      expiresAt: new Date('2026-07-15T11:59:59Z'),
      lastUsedAt: null,
      user: makeUser(),
    });
    expect(await resolveApiKeyUser(db, 'spro_valid', now)).toBeNull();
  });

  it('returns the user and refreshes stale lastUsedAt for a valid key', async () => {
    const { db, update } = makeDb({
      id: 'k1',
      expiresAt: null,
      lastUsedAt: null,
      user: makeUser({ id: 42 }),
    });
    const user = await resolveApiKeyUser(db, 'spro_valid', now);
    expect(user?.id).toBe(42);
    expect(update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { lastUsedAt: now } });
  });

  it('does not refresh lastUsedAt when recently used', async () => {
    const { db, update } = makeDb({
      id: 'k1',
      expiresAt: null,
      lastUsedAt: new Date('2026-07-15T11:59:30Z'), // 30s ago < throttle window
      user: makeUser(),
    });
    await resolveApiKeyUser(db, 'spro_valid', now);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('toSessionUser', () => {
  it('maps a db user to the session user shape with null fallbacks', () => {
    const session = toSessionUser(
      makeUser({ name: null, email: null, image: null, obapiProviderId: null, bankingId: null }),
    );
    expect(session).toMatchObject({
      id: 1,
      name: '',
      email: '',
      image: '',
      currency: 'USD',
      defaultCurrency: null,
      obapiProviderId: undefined,
      bankingId: undefined,
      preferredLanguage: '',
      hiddenFriendIds: [],
    });
  });
});
