jest.mock('~/server/api/services/notificationService', () => ({
  sendExpensePushNotification: jest.fn().mockResolvedValue(undefined),
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

describe('recurrence integration', () => {
  beforeEach(() => resetDatabase());

  it('creates a pg_cron-backed recurrence with an expense', async () => {
    const user = await testUser();
    const caller = callerFor(user.id);
    const [expense] = await caller.expense.addOrEditExpense({
      paidBy: user.id,
      name: 'Recurring expense',
      category: 'Other',
      amount: 500n,
      groupId: null,
      splitType: SplitType.EQUAL,
      currency: 'USD',
      participants: [{ userId: user.id, amount: 500n }],
      cronExpression: '0 0 * * *',
    });

    const recurrence = await db.expenseRecurrence.findFirst({
      include: { job: true, expense: true },
    });
    expect(recurrence?.expense[0]?.id).toBe(expense?.id);
    expect(recurrence?.job.schedule).toBe('0 0 * * *');
  });
});
