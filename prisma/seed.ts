import { PrismaClient, SplitType } from '@prisma/client';

import { createExpense, deleteExpense, editExpense } from '~/server/api/services/splitService';
import { dummyData } from '~/dummies';
import { calculateParticipantSplit } from '~/store/addStore';
import assert from 'node:assert';
import { settleBalances } from './seedSettlement';
import { createDatabaseAdapter } from '~/server/databaseAdapter';
import { env } from '~/env';
import { db } from '~/server/db';
import { forEachSeedBatch } from './seedUtils';

const prisma = new PrismaClient({ adapter: createDatabaseAdapter(env.DATABASE_URL) });

async function createUsers() {
  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({
      data: dummyData.users,
    });

    // Explicit seed IDs do not advance PostgreSQL's auto-increment sequence.
    // Keep subsequent signups above both seeded IDs and previously allocated IDs.
    await tx.$executeRaw`
      SELECT setval(
        pg_get_serial_sequence('public."User"', 'id'),
        GREATEST(
          (SELECT MAX("id") FROM "public"."User"),
          (SELECT last_value FROM "public"."User_id_seq")
        ),
        true
      )
    `;
  });

  console.log('Finished creating users');

  return prisma.user.findMany();
}

async function createGroups() {
  await forEachSeedBatch(dummyData.groups, ({ members, type, ...group }) =>
    prisma.group.create({
      data: {
        ...group,
        groupUsers: {
          create: members.map((member) => ({
            userId: member.id,
          })),
        },
      },
    }),
  );

  console.log('Finished creating groups');

  return prisma.group.findMany();
}

const idLookup: Map<number, string> = new Map();

async function createExpenses() {
  await forEachSeedBatch(dummyData.expenses, async (expense, idx) => {
    const res = await createExpense(
      {
        ...expense,
        paidBy: expense.paidBy.id,
        participants: calculateParticipantSplit(expense as any).participants.map((p) => ({
          userId: p.id,
          amount: p.amount ?? 0n,
        })),
      },
      expense.addedBy,
    );

    await prisma.expense.update({
      where: {
        id: res!.id,
      },
      data: {
        createdAt: expense.createdAt,
      },
    });

    idLookup.set(idx, res!.id);
  });

  console.log('Finished creating expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function editExpenses() {
  await forEachSeedBatch(dummyData.expenseEdits, async ({ idx, ...expense }) => {
    assert(idLookup.get(idx), `No expense ID found for index ${idx}`);
    await editExpense(
      {
        ...expense,
        expenseId: idLookup.get(idx),
        paidBy: expense.paidBy.id,
        participants: calculateParticipantSplit(expense as any).participants.map((p) => ({
          userId: p.id,
          amount: p.amount ?? 0n,
        })),
      },
      expense.updatedBy.id,
    );
  });

  console.log('Finished editing expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function deleteExpenses() {
  await forEachSeedBatch(dummyData.expensesToDelete, async ({ idx, deletedBy }) => {
    assert(idLookup.get(idx), `No expense ID found for index ${idx}`);
    await deleteExpense(idLookup.get(idx)!, deletedBy.id);
  });

  console.log('Finished deleting expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function main() {
  // await prisma.user.deleteMany();
  // await prisma.expense.deleteMany();
  // await prisma.expenseParticipant.deleteMany();
  // await prisma.group.deleteMany();
  // await prisma.groupUser.deleteMany();
  // await prisma.groupBalance.deleteMany();
  await createUsers();
  await createGroups();
  await createExpenses();
  await editExpenses();
  await deleteExpenses();
  await settleBalances(prisma, dummyData.balancesToSettle);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), db.$disconnect()]);
  });
