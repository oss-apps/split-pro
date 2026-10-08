import type { Session } from 'next-auth';
import type { SessionContextValue } from 'next-auth/react';

import { createTestUser } from './user';

export const createTestSession = (overrides: Partial<Session['user']> = {}): Session => ({
  user: { ...createTestUser(), bankingId: undefined, obapiProviderId: undefined, ...overrides },
  expires: '2099-01-01T00:00:00.000Z',
});

export const createMockSession = (
  session: Session | null = createTestSession(),
  loading = false,
): SessionContextValue => {
  const update = jest.fn().mockResolvedValue(session);
  if (loading) {
    return { data: null, status: 'loading', update };
  }
  return session
    ? { data: session, status: 'authenticated', update }
    : { data: null, status: 'unauthenticated', update };
};
