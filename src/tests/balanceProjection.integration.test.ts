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

    const [{ SplitType }, { db }, { addUserExpense, deleteExpense }] = await Promise.all([
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

    const ordinaryOffset = await addUserExpense(
      userB.id,
      'Personal offset',
      'general',
      10,
      SplitType.EXACT,
      'USD',
      [
        { userId: userB.id, amount: 10 },
        { userId: userA.id, amount: -10 },
      ],
      userB.id,
      new Date('2025-12-31'),
    );
    const groupBalanceBeforeSettlement = await db.groupBalance.findUniqueOrThrow({
      where: {
        groupId_currency_firendId_userId: {
          groupId: groupOne.id,
          currency: 'USD',
          userId: userB.id,
          firendId: userA.id,
        },
      },
    });
    assert.equal(groupBalanceBeforeSettlement.amount, -1000);
    await deleteExpense(ordinaryOffset.id, userB.id);

    await addUserExpense(
      userB.id,
      'Settle up',
      'general',
      10,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: userB.id, amount: 10 },
        { userId: userA.id, amount: -10 },
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
    assert.equal(amounts.get(`${groupOne.id}:${userB.id}:${userC.id}`), 2000);
    assert.equal(amounts.get(`${groupOne.id}:${userC.id}:${userB.id}`), -2000);
    assert.equal(amounts.get(`${groupTwo.id}:${userB.id}:${userC.id}`), 500);
    assert.equal(amounts.get(`${groupTwo.id}:${userC.id}:${userB.id}`), -500);

    await db.group.deleteMany({ where: { id: { in: [groupOne.id, groupTwo.id] } } });
    await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } });
    await db.$disconnect();
  },
);

void test(
  'restores group balances when a completed personal settlement becomes partial',
  { skip: !databaseUrl },
  async () => {
    assert.match(new URL(databaseUrl!).pathname, /test/i, 'Refusing to clean a non-test database');
    process.env.DATABASE_URL = databaseUrl;
    process.env.SKIP_ENV_VALIDATION = '1';

    const [
      { SplitType },
      { db },
      { addUserExpense, createGroupExpense, deleteExpense, editExpense },
    ] = await Promise.all([
      import('@prisma/client'),
      import('~/server/db'),
      import('~/server/api/services/splitService'),
    ]);
    const suffix = `${Date.now()}-${Math.random()}`;
    const [debtor, creditor] = await Promise.all([
      db.user.create({ data: { email: `debtor-${suffix}@example.com`, name: 'Debtor' } }),
      db.user.create({ data: { email: `creditor-${suffix}@example.com`, name: 'Creditor' } }),
    ]);
    const [groupOne, groupTwo] = await Promise.all([
      db.group.create({
        data: { name: 'Settlement one', publicId: `settlement-one-${suffix}`, userId: creditor.id },
      }),
      db.group.create({
        data: { name: 'Settlement two', publicId: `settlement-two-${suffix}`, userId: creditor.id },
      }),
    ]);

    await db.groupUser.createMany({
      data: [groupOne, groupTwo].flatMap((group) =>
        [debtor, creditor].map((user) => ({ groupId: group.id, userId: user.id })),
      ),
    });
    await db.balance.createMany({
      data: [
        { userId: debtor.id, friendId: creditor.id, currency: 'USD', amount: -500 },
        { userId: creditor.id, friendId: debtor.id, currency: 'USD', amount: 500 },
      ],
    });
    await db.groupBalance.createMany({
      data: [
        {
          groupId: groupOne.id,
          userId: debtor.id,
          firendId: creditor.id,
          currency: 'USD',
          amount: -300,
        },
        {
          groupId: groupOne.id,
          userId: creditor.id,
          firendId: debtor.id,
          currency: 'USD',
          amount: 300,
        },
        {
          groupId: groupTwo.id,
          userId: debtor.id,
          firendId: creditor.id,
          currency: 'USD',
          amount: -200,
        },
        {
          groupId: groupTwo.id,
          userId: creditor.id,
          firendId: debtor.id,
          currency: 'USD',
          amount: 200,
        },
        {
          groupId: groupOne.id,
          userId: debtor.id,
          firendId: creditor.id,
          currency: 'EUR',
          amount: -700,
        },
        {
          groupId: groupOne.id,
          userId: creditor.id,
          firendId: debtor.id,
          currency: 'EUR',
          amount: 700,
        },
      ],
    });

    const settlement = await addUserExpense(
      debtor.id,
      'Settle up',
      'general',
      5,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 5 },
        { userId: creditor.id, amount: -5 },
      ],
      debtor.id,
      new Date('2026-01-01'),
    );
    assert.ok(settlement);

    const [initialAllocations, settledGroupBalances, otherCurrencyBalances] = await Promise.all([
      db.settlementAllocation.findMany({ where: { settlementExpenseId: settlement.id } }),
      db.groupBalance.findMany({
        where: { groupId: { in: [groupOne.id, groupTwo.id] }, currency: 'USD' },
      }),
      db.groupBalance.findMany({
        where: { groupId: { in: [groupOne.id, groupTwo.id] }, currency: 'EUR' },
      }),
    ]);
    assert.equal(initialAllocations.length, 4);
    assert.equal(
      settledGroupBalances.every((balance) => 0 === balance.amount),
      true,
    );
    assert.deepEqual(
      otherCurrencyBalances.map((balance) => balance.amount).sort((a, b) => a - b),
      [-700, 700],
    );

    await editExpense(
      settlement.id,
      debtor.id,
      'Settle up',
      'general',
      2,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 2 },
        { userId: creditor.id, amount: -2 },
      ],
      debtor.id,
      new Date('2026-01-01'),
    );

    const [overallBalance, restoredGroupBalances, partialAllocations] = await Promise.all([
      db.balance.findUniqueOrThrow({
        where: {
          userId_currency_friendId: {
            userId: creditor.id,
            currency: 'USD',
            friendId: debtor.id,
          },
        },
      }),
      db.groupBalance.findMany({
        where: { groupId: { in: [groupOne.id, groupTwo.id] }, userId: creditor.id },
        orderBy: { groupId: 'asc' },
      }),
      db.settlementAllocation.findMany({ where: { settlementExpenseId: settlement.id } }),
    ]);

    assert.equal(overallBalance.amount, 300);
    const restoredAmounts = new Map(
      restoredGroupBalances.map((balance) => [balance.groupId, balance.amount]),
    );
    assert.equal(restoredAmounts.get(groupOne.id), 300);
    assert.equal(restoredAmounts.get(groupTwo.id), 200);
    assert.equal(partialAllocations.length, 0);

    await editExpense(
      settlement.id,
      debtor.id,
      'Settle up',
      'general',
      5,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 5 },
        { userId: creditor.id, amount: -5 },
      ],
      debtor.id,
      new Date('2026-01-01'),
    );
    await createGroupExpense(
      groupOne.id,
      creditor.id,
      'Later expense',
      'general',
      1,
      SplitType.EQUAL,
      'USD',
      [
        { userId: creditor.id, amount: 1 },
        { userId: debtor.id, amount: -1 },
      ],
      creditor.id,
      new Date('2026-02-01'),
    );
    await editExpense(
      settlement.id,
      debtor.id,
      'Updated settlement note',
      'general',
      5,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 5 },
        { userId: creditor.id, amount: -5 },
      ],
      debtor.id,
      new Date('2026-01-01'),
    );

    const [balancesAfterMetadataEdit, allocationsAfterMetadataEdit] = await Promise.all([
      db.groupBalance.findMany({
        where: { groupId: { in: [groupOne.id, groupTwo.id] }, userId: creditor.id },
      }),
      db.settlementAllocation.findMany({ where: { settlementExpenseId: settlement.id } }),
    ]);
    const metadataEditAmounts = new Map(
      balancesAfterMetadataEdit.map((balance) => [balance.groupId, balance.amount]),
    );
    assert.equal(metadataEditAmounts.get(groupOne.id), 100);
    assert.equal(metadataEditAmounts.get(groupTwo.id), 0);
    assert.equal(allocationsAfterMetadataEdit.length, 4);

    await deleteExpense(settlement.id, debtor.id);

    const [deletedOverallBalance, deletedGroupBalances, deletedAllocations] = await Promise.all([
      db.balance.findUniqueOrThrow({
        where: {
          userId_currency_friendId: {
            userId: creditor.id,
            currency: 'USD',
            friendId: debtor.id,
          },
        },
      }),
      db.groupBalance.findMany({
        where: { groupId: { in: [groupOne.id, groupTwo.id] }, userId: creditor.id },
        orderBy: { groupId: 'asc' },
      }),
      db.settlementAllocation.findMany({ where: { settlementExpenseId: settlement.id } }),
    ]);

    assert.equal(deletedOverallBalance.amount, 600);
    const deletedAmounts = new Map(
      deletedGroupBalances.map((balance) => [balance.groupId, balance.amount]),
    );
    assert.equal(deletedAmounts.get(groupOne.id), 400);
    assert.equal(deletedAmounts.get(groupTwo.id), 200);
    assert.equal(deletedAllocations.length, 0);

    const legacySettlement = await db.expense.create({
      data: {
        paidBy: debtor.id,
        addedBy: debtor.id,
        name: 'Legacy settlement',
        category: 'general',
        amount: 100,
        splitType: SplitType.SETTLEMENT,
        currency: 'USD',
        expenseParticipants: {
          create: [
            { userId: debtor.id, amount: 100 },
            { userId: creditor.id, amount: -100 },
          ],
        },
      },
    });
    await assert.rejects(
      () => deleteExpense(legacySettlement.id, debtor.id),
      /Legacy settlements cannot be edited or deleted safely/,
    );

    const detachedSettlement = await addUserExpense(
      debtor.id,
      'Settle before leaving',
      'general',
      6,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 6 },
        { userId: creditor.id, amount: -6 },
      ],
      debtor.id,
      new Date('2026-03-01'),
    );
    await db.group.delete({ where: { id: groupOne.id } });
    await db.groupUser.delete({
      where: { groupId_userId: { groupId: groupTwo.id, userId: debtor.id } },
    });
    await assert.rejects(
      () =>
        createGroupExpense(
          groupTwo.id,
          creditor.id,
          'Expense after leaving',
          'general',
          1,
          SplitType.EQUAL,
          'USD',
          [
            { userId: creditor.id, amount: 1 },
            { userId: debtor.id, amount: -1 },
          ],
          creditor.id,
          new Date('2026-03-02'),
        ),
      /must be current group members/,
    );
    await editExpense(
      detachedSettlement.id,
      debtor.id,
      'Partial after leaving',
      'general',
      3,
      SplitType.SETTLEMENT,
      'USD',
      [
        { userId: debtor.id, amount: 3 },
        { userId: creditor.id, amount: -3 },
      ],
      debtor.id,
      new Date('2026-03-01'),
    );

    const [detachedBalance, detachedGroupBalance, detachedAllocations] = await Promise.all([
      db.balance.findUniqueOrThrow({
        where: {
          userId_currency_friendId: {
            userId: creditor.id,
            currency: 'USD',
            friendId: debtor.id,
          },
        },
      }),
      db.groupBalance.findUniqueOrThrow({
        where: {
          groupId_currency_firendId_userId: {
            groupId: groupTwo.id,
            currency: 'USD',
            userId: creditor.id,
            firendId: debtor.id,
          },
        },
      }),
      db.settlementAllocation.findMany({
        where: { settlementExpenseId: detachedSettlement.id },
      }),
    ]);
    assert.equal(detachedBalance.amount, 300);
    assert.equal(detachedGroupBalance.amount, 0);
    assert.equal(detachedAllocations.length, 0);

    await db.group.deleteMany({ where: { id: { in: [groupOne.id, groupTwo.id] } } });
    await db.user.deleteMany({ where: { id: { in: [debtor.id, creditor.id] } } });
    await db.$disconnect();
  },
);
