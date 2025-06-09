import { PrismaClient } from '@prisma/client';

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
  }
}

async function main() {
  await createUsers();
  await createGroups();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
