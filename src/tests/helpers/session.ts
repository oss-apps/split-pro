import type { Session } from 'next-auth';

export const testUser = {
  id: 1,
  name: 'Alex Example',
  email: 'alex@example.com',
  image: null,
  currency: 'USD',
  defaultCurrency: null,
  preferredLanguage: 'en',
  hiddenFriendIds: [],
};

export const createTestSession = (overrides: Partial<Session['user']> = {}): Session => ({
  user: { ...testUser, ...overrides },
  expires: '2099-01-01T00:00:00.000Z',
});

export const createMockSession = (session: Session | null = createTestSession()) => ({
  data: session,
  status: session ? ('authenticated' as const) : ('unauthenticated' as const),
  update: jest.fn().mockResolvedValue(session),
});
