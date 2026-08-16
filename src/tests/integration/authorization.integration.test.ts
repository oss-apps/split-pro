import { TRPCError } from '@trpc/server';

jest.mock('~/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('nanoid', () => ({ nanoid: () => 'integration-public-id' }));
jest.mock('superjson', () => ({
  default: { serialize: (value: unknown) => value, deserialize: (value: unknown) => value },
}));
jest.mock('~/server/db', () => {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }) };
});

import { resetDatabase } from './database';
import { testGroup, testUser } from './factories';
import { callerFor } from './trpc';

describe('authorization integration', () => {
  beforeEach(() => resetDatabase());

  it('rejects a non-member from group procedures', async () => {
    const owner = await testUser('Owner');
    const outsider = await testUser('Outsider');
    const group = await testGroup(owner.id);

    await expect(
      callerFor(outsider.id).group.getGroupDetails({ groupId: group.id }),
    ).rejects.toMatchObject(new TRPCError({ code: 'FORBIDDEN', message: 'Not a group member' }));
  });
});
