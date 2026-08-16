import { type Prisma, SplitType } from '@prisma/client';

import { db } from '~/server/db';

let sequence = 0;

export const testUser = async (name = `Test User ${sequence}`) => {
  const id = sequence++;
  return db.user.create({
    data: { name, email: `integration-${id}@splitpro.test`, currency: 'USD' },
  });
};

export const testGroup = async (userId: number, name = `Test Group ${sequence++}`) =>
  db.group.create({
    data: {
      name,
      publicId: `integration-group-${sequence++}`,
      userId,
      groupUsers: { create: { userId } },
    },
  });

export const testExpense = async (input: {
  paidBy: number;
  participantId: number;
  groupId?: number | null;
  amount?: bigint;
  name?: string;
}) => {
  const amount = input.amount ?? 1_000n;
  const data: Prisma.ExpenseCreateInput = {
    name: input.name ?? `Test Expense ${sequence++}`,
    category: 'Other',
    amount,
    currency: 'USD',
    splitType: SplitType.EQUAL,
    addedByUser: { connect: { id: input.paidBy } },
    paidByUser: { connect: { id: input.paidBy } },
    ...(input.groupId ? { group: { connect: { id: input.groupId } } } : {}),
    expenseParticipants: {
      create: [
        { userId: input.paidBy, amount },
        { userId: input.participantId, amount: -amount },
      ],
    },
  };
  return db.expense.create({ data });
};
