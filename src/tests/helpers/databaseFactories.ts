import { randomUUID } from 'node:crypto';
import { type Prisma, type PrismaClient, SplitType } from '@prisma/client';

import type { CreateExpense } from '~/types/expense.types';

export const createDatabaseUser = (db: PrismaClient, overrides: Prisma.UserCreateInput = {}) =>
  db.user.create({
    data: {
      name: 'Test User',
      email: `test-${randomUUID()}@example.test`,
      currency: 'USD',
      preferredLanguage: 'en',
      ...overrides,
    },
  });

export const createDatabaseGroup = (
  db: PrismaClient,
  ownerId: number,
  memberIds: number[] = [],
  overrides: Pick<Prisma.GroupCreateInput, 'name'> &
    Partial<Pick<Prisma.GroupCreateInput, 'archivedAt' | 'simplifyDebts'>> = { name: 'Test Group' },
) =>
  db.group.create({
    data: {
      ...overrides,
      publicId: randomUUID(),
      userId: ownerId,
      groupUsers: { create: [...new Set([ownerId, ...memberIds])].map((userId) => ({ userId })) },
    },
  });

export const expenseInput = (
  payerId: number,
  participantId: number,
  overrides: Partial<CreateExpense> = {},
): CreateExpense => {
  const amount = overrides.amount ?? 2000n;
  const debt = amount / 2n;
  return {
    paidBy: payerId,
    name: 'Dinner',
    category: 'Food',
    amount,
    groupId: null,
    splitType: SplitType.EQUAL,
    currency: 'USD',
    participants: [
      { userId: payerId, amount: debt },
      { userId: participantId, amount: -debt },
    ],
    ...overrides,
  };
};

export const createDatabaseExpense = (
  db: PrismaClient,
  input: CreateExpense,
  addedBy = input.paidBy,
) => {
  const { participants, expenseId: _expenseId, ...data } = input;
  return db.expense.create({
    data: {
      ...data,
      addedBy,
      expenseParticipants: { create: participants },
    },
  });
};
