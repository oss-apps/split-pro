import assert from 'node:assert/strict';
import { test } from 'node:test';

const databaseUrl = process.env.TEST_DATABASE_URL;

void test(
  'does not zero unrelated group balances when one overall balance settles',
  { skip: !databaseUrl },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /test/i, 'Refusing to clean a non-test database');
    process.env.DATABASE_URL = databaseUrl;
    process.env.SKIP_ENV_VALIDATION = '1';

    const [{ SplitType }, { db }, { createGroupExpense }] = await Promise.all([
      import('@prisma/client'),
      import('~/server/db'),
      import('~/server/api/services/splitService'),
    ]);

    const suffix = `${Date.now()}-${Math.random()}`;
    const [userA, userB, userC] = await Promise.all([
      db.user.create({ data: { email: `a-${suffix}@example.com`, name: 'A' } }),
      db.user.create({ data: { email: `b-${suffix}@example.com`, name: 'B' } }),
      db.user.create({ data: { email: `c-${suffix}@example.com`, name: 'C' } }),
    ]);
    const [groupOne, groupTwo] = await Promise.all([
      db.group.create({ data: { name: 'One', publicId: `one-${suffix}`, userId: userB.id } }),
      db.group.create({ data: { name: 'Two', publicId: `two-${suffix}`, userId: userB.id } }),
    ]);

    await db.groupUser.createMany({
      data: [groupOne, groupTwo].flatMap((group) =>
        [userA, userB, userC].map((user) => ({ groupId: group.id, userId: user.id })),
      ),
    });
    await db.balance.createMany({
      data: [
        { userId: userB.id, friendId: userA.id, currency: 'USD', amount: -1000 },
        { userId: userA.id, friendId: userB.id, currency: 'USD', amount: 1000 },
        { userId: userB.id, friendId: userC.id, currency: 'USD', amount: 2000 },
        { userId: userC.id, friendId: userB.id, currency: 'USD', amount: -2000 },
      ],
    });
    await db.groupBalance.createMany({
      data: [
        {
          groupId: groupOne.id,
          userId: userB.id,
          firendId: userA.id,
          currency: 'USD',
          amount: -1000,
        },
        {
          groupId: groupOne.id,
          userId: userA.id,
          firendId: userB.id,
          currency: 'USD',
          amount: 1000,
        },
        {
          groupId: groupOne.id,
          userId: userB.id,
          firendId: userC.id,
          currency: 'USD',
          amount: 2000,
        },
        {
          groupId: groupOne.id,
          userId: userC.id,
          firendId: userB.id,
          currency: 'USD',
          amount: -2000,
        },
        {
          groupId: groupTwo.id,
          userId: userB.id,
          firendId: userC.id,
          currency: 'USD',
          amount: 500,
        },
        {
          groupId: groupTwo.id,
          userId: userC.id,
          firendId: userB.id,
          currency: 'USD',
          amount: -500,
        },
      ],
    });

    await createGroupExpense(
      groupOne.id,
      userB.id,
      'Dinner',
      'general',
      20,
      SplitType.EQUAL,
      'USD',
      [
        { userId: userB.id, amount: 20 },
        { userId: userA.id, amount: -10 },
        { userId: userC.id, amount: -10 },
      ],
      userB.id,
      new Date('2026-01-01'),
    );

    const rows = await db.groupBalance.findMany({
      where: {
        currency: 'USD',
        OR: [{ userId: userB.id }, { firendId: userB.id }],
      },
      orderBy: [{ groupId: 'asc' }, { firendId: 'asc' }],
    });
    const amounts = new Map(
      rows.map((row) => [`${row.groupId}:${row.userId}:${row.firendId}`, row.amount]),
    );

    assert.equal(amounts.get(`${groupOne.id}:${userB.id}:${userA.id}`), 0);
    assert.equal(amounts.get(`${groupOne.id}:${userA.id}:${userB.id}`), 0);
    assert.equal(amounts.get(`${groupOne.id}:${userB.id}:${userC.id}`), 3000);
    assert.equal(amounts.get(`${groupOne.id}:${userC.id}:${userB.id}`), -3000);
    assert.equal(amounts.get(`${groupTwo.id}:${userB.id}:${userC.id}`), 500);
    assert.equal(amounts.get(`${groupTwo.id}:${userC.id}:${userB.id}`), -500);

    await db.group.deleteMany({ where: { id: { in: [groupOne.id, groupTwo.id] } } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } });
    await db.$disconnect();
  },
);
