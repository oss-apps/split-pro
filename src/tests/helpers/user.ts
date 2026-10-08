import type { User } from '@prisma/client';

export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  name: 'Alex Example',
  email: 'alex@example.test',
  emailVerified: null,
  image: null,
  currency: 'USD',
  defaultCurrency: null,
  preferredLanguage: 'en',
  bankingId: null,
  obapiProviderId: null,
  hiddenFriendIds: [],
  ...overrides,
});
