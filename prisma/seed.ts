import { PrismaClient, SplitType } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

async function createUsers() {
  const users = await prisma.user.createMany({
    data: [
      {
        name: 'Alice',
        email: 'alice@example.com',
        currency: 'USD',
      },
      {
        name: 'Bob',
        email: 'bob@example.com',
        currency: 'EUR',
      },
      {
        name: 'Charlie',
        email: 'charlie@example.com',
        currency: 'GBP',
      },
      {
        name: 'Diana',
        email: 'diana@example.com',
        currency: 'JPY',
      },
      {
        name: 'Evan',
        email: 'evan@example.com',
        currency: 'CNY',
      },
    ],
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
    console.log('Group created and users added');

    return group;
  }
}

async function createExpenses(group, users) {
  for (let i = 0; i < 100000; i++) {
    const amount = BigInt(randomInt(1000, 10000));
    const expense = await prisma.expense.create({
      data: {
        name: `Expense ${i}`,
        paidBy: users[0].id,
        addedBy: users[0].id,
        category: 'general',
        currency: 'USD',
        amount: amount,
        groupId: group.id,
        splitType: SplitType.EQUAL,
      },
    });

    await prisma.expenseParticipant.createMany({
      data: [
        {
          expenseId: expense.id,
          userId: users[0].id,
          amount: amount,
        },
        {
          expenseId: expense.id,
          userId: users[1].id,
          amount: -amount / BigInt(5),
        },
        {
          expenseId: expense.id,
          userId: users[2].id,
          amount: -amount / BigInt(5),
        },
        {
          expenseId: expense.id,
          userId: users[3].id,
          amount: -amount / BigInt(5),
        },
        {
          expenseId: expense.id,
          userId: users[4].id,
          amount: -amount / BigInt(5),
        },
      ],
    });
  }
  console.log('Expenses added');
}

async function main() {
  const users = await createUsers();
  const group = await createGroups();
  await createExpenses(group, users);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
