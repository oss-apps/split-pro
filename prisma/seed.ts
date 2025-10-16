import { PrismaClient } from '@prisma/client';

import { createExpense } from '~/server/api/services/splitService';
import { dummyExpenses, dummyGroups, dummyUsers } from '~/dummies';
import { calculateParticipantSplit, Participant } from '~/store/addStore';

const prisma = new PrismaClient();

async function createUsers() {
  await prisma.user.createMany({
    data: dummyUsers,
  });

  console.log('Finished creating users');

  return prisma.user.findMany();
}

async function createGroups() {
  await Promise.all(
    dummyGroups.map(({ members, type, ...group }) =>
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

async function createExpenses() {
  for (let i = 0; i < dummyExpenses.length; i++) {
    const { splitShares, ...expense } = dummyExpenses[i]!;
    await createExpense(
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

    if ((i + 1) % 100 === 0) {
      console.log(`Created ${i + 1} / ${dummyExpenses.length} expenses`);
    }
  }

  console.log('Finished creating expenses');

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
