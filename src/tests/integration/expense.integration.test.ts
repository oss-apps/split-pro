import { SplitType } from '@prisma/client';

import { db } from './database';
import { accountingSnapshot, testScenario } from './factories';
import { callerFor } from './trpc';

describe('expense lifecycle', () => {
  it('creates, edits and soft-deletes an expense with exact bidirectional balances', async () => {
    const { owner, member, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    expect(expense).toBeDefined();
    const balances = () =>
      db.balanceView.findMany({ where: { groupId: group.id }, orderBy: { userId: 'asc' } });
    expect(await balances()).toEqual([
      expect.objectContaining({ userId: owner.id, friendId: member.id, amount: 1000n }),
      expect.objectContaining({ userId: member.id, friendId: owner.id, amount: -1000n }),
    ]);
    await caller.expense.addOrEditExpense({
      ...input,
      expenseId: expense!.id,
      amount: 6000n,
      participants: [
        { userId: owner.id, amount: 3000n },
        { userId: member.id, amount: -3000n },
      ],
    });
    expect((await balances()).map((balance) => balance.amount)).toEqual([3000n, -3000n]);
    expect(await db.expenseParticipant.count({ where: { expenseId: expense!.id } })).toBe(2);
    await caller.expense.deleteExpense({ expenseId: expense!.id });
    expect((await balances()).every((balance) => 0n === balance.amount)).toBe(true);
    expect(await caller.expense.getGroupExpenses({ groupId: group.id })).toEqual([]);
    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      deletedBy: owner.id,
      deletedAt: expect.any(Date),
    });
  });

  it.each([false, true])(
    'rolls back invalid participants, including cron jobs: recurring=$recurring',
    async (recurring) => {
      const { owner, input } = await testScenario();
      if (recurring) {
        await callerFor(owner.id).expense.addOrEditExpense({
          ...input,
          cronExpression: '0 0 1 1 *',
        });
      }
      const before = await accountingSnapshot();
      const jobsBefore = await db.job.findMany();
      // A missing user forces the nested write to fail after scheduling a recurring job.
      const invalid = {
        ...input,
        participants: [{ userId: -1, amount: -1000n }],
        ...(recurring ? { cronExpression: '0 0 1 1 *' } : {}),
      };
      const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        await expect(callerFor(owner.id).expense.addOrEditExpense(invalid)).rejects.toMatchObject({
          code: 'INTERNAL_SERVER_ERROR',
        });
        expect(await accountingSnapshot()).toEqual(before);
        expect(await db.expenseRecurrence.count()).toBe(recurring ? 1 : 0);
        expect(await db.job.findMany()).toEqual(jobsBefore);
      } finally {
        log.mockRestore();
      }
    },
  );

  it('preserves the original expense if an edit transaction fails', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const before = await accountingSnapshot();
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(
        caller.expense.addOrEditExpense({
          ...input,
          expenseId: expense!.id,
          amount: 999n,
          participants: [{ userId: -1, amount: -999n }],
        }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
      expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
        amount: 2000n,
      });
      expect(await db.expenseParticipant.count()).toBe(2);
      expect(await accountingSnapshot()).toEqual(before);
    } finally {
      log.mockRestore();
    }
  });
});

describe('settlement accounting', () => {
  it.each([false, true])(
    'partially then fully settles debt in either direction: reverse=%s',
    async (reverse) => {
      const { owner, member, input, group } = await testScenario();
      await callerFor(owner.id).expense.addOrEditExpense(input);
      const payerId = reverse ? owner.id : member.id;
      const receiverId = reverse ? member.id : owner.id;
      if (reverse) {
        await db.expense.deleteMany();
        await callerFor(member.id).expense.addOrEditExpense({
          ...input,
          paidBy: member.id,
          participants: [
            { userId: member.id, amount: 1000n },
            { userId: owner.id, amount: -1000n },
          ],
        });
      }
      const settle = (amount: bigint) =>
        callerFor(payerId).expense.addOrEditExpense({
          ...input,
          name: 'Settlement',
          splitType: SplitType.SETTLEMENT,
          amount,
          paidBy: payerId,
          participants: [
            { userId: payerId, amount },
            { userId: receiverId, amount: -amount },
          ],
        });
      await settle(400n);
      expect(
        await db.balanceView.findFirst({ where: { groupId: group.id, userId: payerId } }),
      ).toMatchObject({ amount: -600n });
      await settle(600n);
      expect((await db.balanceView.findMany()).every((balance) => 0n === balance.amount)).toBe(
        true,
      );
      expect(await callerFor(owner.id).group.getGroupTotals({ groupId: group.id })).toEqual([
        expect.objectContaining({ currency: 'USD', _sum: { amount: 2000n } }),
      ]);
    },
  );
});
