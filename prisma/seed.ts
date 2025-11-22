import { PrismaClient, SplitType } from '@prisma/client';

import { createExpense, deleteExpense, editExpense } from '~/server/api/services/splitService';
import { dummyData } from '~/dummies';
import { calculateParticipantSplit, Participant } from '~/store/addStore';
import assert from 'node:assert';
import { BigMath } from '~/utils/numbers';
import { DEFAULT_CATEGORY } from '~/lib/category';

const prisma = new PrismaClient();

async function createUsers() {
  await prisma.user.createMany({
    data: dummyData.users,
  });

  console.log('Finished creating users');

  return prisma.user.findMany();
}

async function createGroups() {
  await Promise.all(
    dummyData.groups.map(({ members, type, ...group }) =>
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
    ),
  );

  console.log('Finished creating groups');

  return prisma.group.findMany();
}

const idLookup: Map<number, string> = new Map();

async function createExpenses() {
  await Promise.all(
    dummyData.expenses.map(async ({ splitShares, ...expense }, idx) => {
      const res = await createExpense(
        {
          ...expense,
          paidBy: expense.paidBy.id,
          participants: calculateParticipantSplit(
            expense.amount,
            expense.participants as Participant[],
            expense.splitType,
            splitShares,
            expense.paidBy as Participant,
          ).participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
        },
        expense.addedBy,
      );

      idLookup.set(idx, res!.id);
    }),
  );

  console.log('Finished creating expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function editExpenses() {
  await Promise.all(
    dummyData.expenseEdits.map(async ({ splitShares, idx, ...expense }) => {
      assert(idLookup.get(idx), `No expense ID found for index ${idx}`);
      await editExpense(
        {
          ...expense,
          expenseId: idLookup.get(idx),
          paidBy: expense.paidBy.id,
          participants: calculateParticipantSplit(
            expense.amount,
            expense.participants as Participant[],
            expense.splitType,
            splitShares,
            expense.paidBy as Participant,
          ).participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
        },
        expense.updatedBy.id,
      );
    }),
  );

  console.log('Finished editing expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function deleteExpenses() {
  await Promise.all(
    dummyData.expensesToDelete.map(async ({ idx, deletedBy }) => {
      assert(idLookup.get(idx), `No expense ID found for index ${idx}`);
      await deleteExpense(idLookup.get(idx)!, deletedBy.id);
    }),
  );

  console.log('Finished deleting expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function settleBalances() {
  await Promise.all(
    dummyData.balancesToSettle.map(async ([userId, friendId, groupId, currency]) => {
      const groupBalance = await prisma.balanceView.findFirst({
        where: {
          userId,
          friendId,
          groupId,
          currency,
        },
      });

      const sender = 0n > groupBalance!.amount ? friendId : userId;
      const receiver = 0n > groupBalance!.amount ? userId : friendId;

      await createExpense(
        {
          name: 'Settle up',
          amount: BigMath.abs(groupBalance!.amount),
          currency,
          splitType: SplitType.SETTLEMENT,
          groupId,
          participants: [
            {
              userId: sender,
              amount: groupBalance!.amount,
            },
            {
              userId: receiver,
              amount: -groupBalance!.amount,
            },
          ],
          paidBy: sender,
          category: DEFAULT_CATEGORY,
        },
        sender,
      );
    }),
  );

  console.log('Finished settling balances');
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
  await settleBalances();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
