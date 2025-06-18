import { PrismaClient, SplitType } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

async function createUsers() {
  const data = Array.from({ length: 1000 }, (value, index) => index).map(i => {
    return {
      name: `user${i}`,
      email: `user${i}@example.com`,
      currency: 'USD'
    }
  })
  const users = await prisma.user.createMany({
    data: data
  })
  return prisma.user.findMany({
    orderBy: {
      id: 'asc'
    }
  });
}

async function createGroups(users) {
  if (users.length) {
    for (let i = 0; i < 100; i++) {
      const s = i * 10
      const e = ((i + 1)) * 10 - 1


      // group of 10
      const group = await prisma.group.create({
        data: {
          name: `Group_10_${i}`,
          publicId: `Group-10-${i}`,
          defaultCurrency: 'EUR',
          userId: users[s].id
        }
      });

      await prisma.groupUser.createMany({
        data: users.slice(s, e).map(u => {
          return {
            groupId: group.id,
            userId: u.id
          }
        })
      });

    }
  }

  const group = await prisma.group.create({
    data: {
      name: `Group_30`,
      publicId: `Group-30`,
      defaultCurrency: 'EUR',
      userId: users[0].id
    }
  });

  await prisma.groupUser.createMany({
    data: users.slice(0, 29).map(u => {
      return {
        groupId: group.id,
        userId: u.id
      }
    })
  });

  return prisma.group.findMany({
    include: {
      groupUsers: true
    }
  })
}

async function createExpenses(groups) {
  const currencies = ['EUR', 'USD']
  for (const gid in groups) {
    const group = groups[gid]
    for (let i = 0; i < 10000; i++) {
      const c = randomInt(0,2)
      const amount = BigInt(randomInt(1000, 10000));

      const expense = await prisma.expense.create({
        data: {
          name: `Expense Group ${group.id} ${i}`,
          paidBy: group.groupUsers[0].userId,
          addedBy: group.groupUsers[0].userId,
          category: 'general',
          currency: currencies[c],
          amount: amount,
          groupId: group.id,
          splitType: SplitType.EQUAL,
        }
      });

      await prisma.expenseParticipant.createMany({
        data: [
          { expenseId: expense.id, userId: group.groupUsers[0].userId, amount: amount },
          ...group.groupUsers.slice(1).map(u => {
            return {
              expenseId: expense.id,
              userId: u.userId,
              amount: -amount / BigInt(group.groupUsers.length),
            }
          })]
      });
    }
  }
}

async function main() {
  const users = await createUsers();
  const groups = await createGroups(users);
  await createExpenses(groups);
  console.log("Seeded db with users, groups and expenses")
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
