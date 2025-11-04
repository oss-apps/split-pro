import { PrismaClient } from '@prisma/client';

import { createExpense, deleteExpense, editExpense } from '~/server/api/services/splitService';
import { dummyData } from '~/dummies';
import { calculateParticipantSplit, Participant } from '~/store/addStore';
import assert from 'node:assert';

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

const idLookup: string[] = [];

async function createExpenses() {
  for (let i = 0; i < dummyData.expenses.length; i++) {
    const { splitShares, ...expense } = dummyData.expenses[i]!;
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

    idLookup.push(res!.id);

    if ((i + 1) % 100 === 0) {
      console.log(`Created ${i + 1} / ${dummyData.expenses.length} expenses`);
    }
  }

  console.log('Finished creating expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function editExpenses() {
  for (let i = 0; i < dummyData.expenseEdits.length; i++) {
    const { splitShares, idx, ...expense } = dummyData.expenseEdits[i]!;
    assert(idLookup[idx], `No expense ID found for index ${idx}`);
    await editExpense(
      {
        ...expense,
        expenseId: idLookup[idx]!,
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

    if ((i + 1) % 100 === 0) {
      console.log(`Edited ${i + 1} / ${dummyData.expenseEdits.length} expenses`);
    }
  }

  console.log('Finished editing expenses');

  return prisma.expense.findMany({ include: { expenseParticipants: true } });
}

async function deleteExpenses() {
  for (let i = 0; i < dummyData.expensesToDelete.length; i++) {
    const { idx, deletedBy } = dummyData.expensesToDelete[i]!;
    assert(idLookup[idx], `No expense ID found for index ${idx}`);
    await deleteExpense(idLookup[idx]!, deletedBy.id);

    if ((i + 1) % 100 === 0) {
      console.log(`Deleted ${i + 1} / ${dummyData.expensesToDelete.length} expenses`);
    }
  }

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
