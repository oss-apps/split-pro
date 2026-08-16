jest.mock('~/server/api/services/notificationService', () => ({
  sendExpensePushNotification: jest.fn().mockResolvedValue(undefined),
  sendGroupSimplifyDebtsToggleNotification: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('~/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('nanoid', () => ({ nanoid: () => 'integration-public-id' }));
jest.mock('superjson', () => ({
  default: { serialize: (value: unknown) => value, deserialize: (value: unknown) => value },
}));
jest.mock('~/server/db', () => {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }) };
});

import { SplitType } from '@prisma/client';

import { db } from '~/server/db';
import { resetDatabase } from './database';
import { testUser } from './factories';
import { callerFor } from './trpc';

describe('expense integration', () => {
  beforeEach(() => resetDatabase());

  it('persists an expense transaction and exposes its balance view', async () => {
    const payer = await testUser('Payer');
    const participant = await testUser('Participant');
    const caller = callerFor(payer.id);

    const [expense] = await caller.expense.addOrEditExpense({
      paidBy: payer.id,
      name: 'Dinner',
      category: 'Food',
      amount: 2_500n,
      groupId: null,
      splitType: SplitType.EQUAL,
      currency: 'USD',
      participants: [
        { userId: payer.id, amount: 2_500n },
        { userId: participant.id, amount: -2_500n },
      ],
    });

    expect(expense?.id).toBeDefined();
    await expect(db.balanceView.findMany({ where: { groupId: null } })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: payer.id, friendId: participant.id, amount: 2_500n }),
      ]),
    );
  });
});
