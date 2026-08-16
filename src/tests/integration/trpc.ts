import { type Session } from 'next-auth';

import { appRouter } from '~/server/api/root';
import { createInnerTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';

export const sessionFor = (userId: number): Session => ({
  user: {
    id: userId,
    name: `Integration User ${userId}`,
    email: null,
    currency: 'USD',
    preferredLanguage: '',
    hiddenFriendIds: [],
  },
  expires: '2099-01-01T00:00:00.000Z',
});

export const callerFor = (userId: number) =>
  appRouter.createCaller(createInnerTRPCContext({ session: sessionFor(userId), db }));
