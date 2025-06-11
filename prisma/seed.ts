import { PrismaClient, SplitType } from '@prisma/client';

import { createGroupExpense } from '~/server/api/services/splitService';
import { dummyExpenses, dummyUsers } from '~/utils/dummies';

const prisma = new PrismaClient();

async function createUsers() {
  await prisma.user.createMany({
    data: dummyUsers,
  });

  return prisma.user.findMany();
}

async function createGroups() {
  // Assuming Alice creates a group and adds Bob and Charlie

  const users = await prisma.user.findMany();

  if (users.length) {
    const group = await prisma.group.create({
      data: {
        name: 'Holiday Trip',
        publicId: 'holiday-trip-123',
        defaultCurrency: 'USD',
        createdBy: { connect: { id: users[0]?.id } },
      },
    });

    await prisma.groupUser.createMany({
      data: users.map((u) => ({ groupId: group.id, userId: u.id })),
    });
  }
}

async function createGroupExpenses() {
  const users = await prisma.user.findMany();
  const group = (await prisma.group.findFirst())!;

  const groupId = group.id;

  const expenses = [];

  for (let i = 0; i < dummyExpenses.length; i++) {
    const template = dummyExpenses[i]!;
    const paidBy = users[template.paidByIndex]!;
    const participants = template.participantIndices.map((index) => users[index]!);
    const baseAmount = BigInt(template.amount);

    let participantsData;

    if (template.splitType === SplitType.EQUAL) {
      const amountPerPerson = baseAmount / BigInt(participants.length);
      participantsData = participants.map((user) => ({
        userId: user.id,
        amount: user.id === paidBy.id ? baseAmount - amountPerPerson : -amountPerPerson,
      }));
    } else if (template.splitType === SplitType.PERCENTAGE) {
      const percentages =
        template.participantIndices.length === 4 ? [30, 25, 25, 20] : [40, 35, 25];
      participantsData = participants.map((user, index) => {
        const percentage = percentages[index]!;
        const amount = (baseAmount * BigInt(percentage)) / 100n;
        return {
          userId: user.id,
          amount: user.id === paidBy.id ? baseAmount - amount : -amount,
        };
      });
    } else if (template.splitType === SplitType.EXACT) {
      const amounts =
        template.participantIndices.length === 4 ? [4000, 3600, 4000, 4000] : [2750, 2750];
      participantsData = participants.map((user, index) => {
        const amount = BigInt(amounts[index]!);
        return {
          userId: user.id,
          amount: user.id === paidBy.id ? baseAmount - amount : -amount,
        };
      });
    } else if (template.splitType === SplitType.SHARE) {
      const shares = template.participantIndices.length === 3 ? [2, 1, 1] : [3, 2];
      const totalShares = shares.reduce((sum, share) => sum + share, 0);
      participantsData = participants.map((user, index) => {
        const amount = (baseAmount * BigInt(shares[index]!)) / BigInt(totalShares);
        return {
          userId: user.id,
          amount: user.id === paidBy.id ? baseAmount - amount : -amount,
        };
      });
    } else {
      const baseAmountPerPerson = baseAmount / BigInt(participants.length);
      const adjustments = participants.length === 3 ? [500, -200, -300] : [300, 100, -400];
      participantsData = participants.map((user, index) => {
        const adjustment = BigInt(adjustments[index] ?? 0);
        const amount = baseAmountPerPerson + adjustment;
        return {
          userId: user.id,
          amount: user.id === paidBy.id ? baseAmount - amount : -amount,
        };
      });
    }

    const expenseDate = new Date('2024-12-01');
    expenseDate.setDate(expenseDate.getDate() + i);

    const expense = await createGroupExpense(
      groupId,
      paidBy.id,
      template.name,
      template.category,
      baseAmount,
      template.splitType,
      template.currency,
      participantsData,
      paidBy.id,
      expenseDate,
    );

    expenses.push(expense);
  }

  return expenses;
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
  await createGroupExpenses();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
