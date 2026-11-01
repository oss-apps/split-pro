import { PrismaClient } from '@prisma/client';

import { withBalanceCutoff } from '~/server/api/services/balanceQuery';
import { createDatabaseAdapter } from '~/server/databaseAdapter';

import { createDatabaseExpense } from '../helpers/databaseFactories';
import { getTestDatabaseUrl } from '../helpers/testDatabase';
import { db } from './database';
import { testScenario } from './factories';

const cutoff = new Date('2026-03-29T22:00:00.000Z');

describe('expense-date-filtered balance view', () => {
  it('filters before aggregation and preserves Prisma filters, includes and groupBy', async () => {
    const { owner, member, group, input } = await testScenario();
    await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(cutoff.getTime() - 1),
    });
    await createDatabaseExpense(db, { ...input, expenseDate: cutoff });
    await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(cutoff.getTime() + 1),
    });

    const result = await withBalanceCutoff(db, cutoff, async (tx) => ({
      balances: await tx.balanceView.findMany({
        where: { userId: owner.id, groupId: group.id, amount: { not: 0n } },
        include: { group: true, friend: true },
      }),
      totals: await tx.balanceView.groupBy({
        by: ['currency'],
        where: { userId: owner.id },
        _sum: { amount: true },
      }),
      members: await tx.balanceView.findMany({ where: { groupId: group.id } }),
    }));

    expect(result.balances).toHaveLength(1);
    expect(result.balances[0]).toMatchObject({
      amount: 1000n,
      group: { id: group.id },
      friend: { id: member.id },
    });
    expect(result.totals).toEqual([{ currency: 'USD', _sum: { amount: 1000n } }]);
    expect(result.members).toHaveLength(2);
    expect(result.members.map(({ amount }) => amount)).toEqual(
      expect.arrayContaining([-1000n, 1000n]),
    );
    expect(await db.balanceView.findFirst({ where: { userId: owner.id } })).toMatchObject({
      amount: 3000n,
    });
    expect(
      await withBalanceCutoff(db, null, (tx) =>
        tx.balanceView.findFirst({ where: { userId: owner.id } }),
      ),
    ).toMatchObject({ amount: 3000n });
  });

  it('excludes deleted expenses and respects UTC storage even with another SQL time zone', async () => {
    const { owner, input } = await testScenario();
    const expense = await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(cutoff.getTime() - 1),
    });

    expect(
      await withBalanceCutoff(db, cutoff, async (tx) => {
        await tx.$queryRaw`SELECT set_config('TimeZone', 'Pacific/Auckland', true)`;
        return tx.balanceView.findFirst({ where: { userId: owner.id } });
      }),
    ).toMatchObject({ amount: 1000n });

    await db.expense.update({ where: { id: expense.id }, data: { deletedAt: new Date() } });
    expect(await withBalanceCutoff(db, cutoff, (tx) => tx.balanceView.findMany())).toEqual([]);
  });

  it('does not retain the cutoff after commit or rollback', async () => {
    const { input } = await testScenario();
    await createDatabaseExpense(db, { ...input, expenseDate: cutoff });
    expect(await withBalanceCutoff(db, cutoff, (tx) => tx.balanceView.findMany())).toEqual([]);
    expect(await db.balanceView.findMany()).toHaveLength(2);

    await expect(
      withBalanceCutoff(db, cutoff, async () => {
        throw new Error('Rollback');
      }),
    ).rejects.toThrow('Rollback');
    expect(await db.balanceView.findMany()).toHaveLength(2);

    expect(
      await withBalanceCutoff(db, new Date(cutoff.getTime() + 1), (tx) =>
        tx.balanceView.findMany(),
      ),
    ).toHaveLength(2);
  });

  it('isolates concurrent cutoffs on different pooled connections', async () => {
    const { input } = await testScenario();
    await createDatabaseExpense(db, { ...input, expenseDate: cutoff });
    const url = new URL(getTestDatabaseUrl());
    url.searchParams.set('connection_limit', '3');
    const client = new PrismaClient({ adapter: createDatabaseAdapter(url.toString()) });
    let entered = 0;
    let release = () => {};
    const bothEntered = new Promise<void>((resolve) => {
      release = resolve;
    });

    try {
      const counts = await Promise.all(
        [cutoff, new Date(cutoff.getTime() + 1), null].map((date) =>
          withBalanceCutoff(client, date, async (tx) => {
            entered += 1;
            if (3 === entered) {
              release();
            }
            await bothEntered;
            return tx.balanceView.count();
          }),
        ),
      );
      expect(counts).toEqual([0, 2, 2]);
    } finally {
      await client.$disconnect();
    }
  });
});
