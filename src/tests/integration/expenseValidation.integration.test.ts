// Check each rejected write and its snapshot before sending the next request.
// oxlint-disable no-await-in-loop
import { editExpense } from '~/server/api/services/splitService';

import { db } from './database';
import { accountingSnapshot, expenseInput, testScenario } from './factories';
import { callerFor } from './trpc';

describe('expense write validation', () => {
  it.each(['payer', 'participant', 'zero participant'] as const)(
    'rejects an outside %s on creation and same-group edits',
    async (role) => {
      const { owner, outsider, input } = await testScenario();
      const caller = callerFor(owner.id);
      const [expense] = await caller.expense.addOrEditExpense(input);
      const invalid =
        'payer' === role
          ? {
              ...input,
              paidBy: outsider.id,
              participants: input.participants.map((p) => ({
                ...p,
                userId: p.userId === owner.id ? outsider.id : p.userId,
              })),
            }
          : {
              ...input,
              participants:
                'zero participant' === role
                  ? [...input.participants, { userId: outsider.id, amount: 0n }]
                  : input.participants.map((p) => ({
                      ...p,
                      userId: p.userId === owner.id ? p.userId : outsider.id,
                    })),
            };
      const before = await accountingSnapshot();
      for (const expenseId of [undefined, expense!.id]) {
        await expect(
          caller.expense.addOrEditExpense({ ...invalid, expenseId, cronExpression: '0 0 1 1 *' }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(await accountingSnapshot()).toEqual(before);
        expect(await db.job.count()).toBe(0);
      }
    },
  );

  it.each(['payer', 'participant'] as const)(
    'allows descriptive edits after the settled %s leaves, but rejects financial changes',
    async (role) => {
      const { owner, member, outsider, group } = await testScenario();
      const caller = callerFor(owner.id);
      const payerId = 'payer' === role ? member.id : owner.id;
      const otherId = 'payer' === role ? owner.id : member.id;
      const input = expenseInput(payerId, otherId, {
        groupId: group.id,
        expenseDate: new Date('2026-01-01T12:00:00Z'),
      });
      const [expense] = await caller.expense.addOrEditExpense(input);
      await caller.expense.addOrEditExpense(expenseInput(otherId, payerId, { groupId: group.id }));
      await callerFor(member.id).group.leaveGroup({ groupId: group.id });
      const before = await accountingSnapshot();

      await caller.expense.addOrEditExpense({
        ...input,
        expenseId: expense!.id,
        name: 'Corrected description',
        category: 'Other',
        participants: [...input.participants].reverse(),
      });
      const after = await accountingSnapshot();
      expect(after.participants).toEqual(before.participants);
      expect(after.balances).toEqual(
        before.balances.map((balance) => ({ ...balance, updatedAt: expect.any(Date) })),
      );
      expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
        name: 'Corrected description',
        category: 'Other',
        amount: input.amount,
      });

      for (const changes of [
        {
          amount: input.amount * 2n,
          participants: input.participants.map((p) => ({ ...p, amount: p.amount * 2n })),
        },
        { currency: 'EUR' },
        {
          paidBy: otherId,
          participants: input.participants.map((p) => ({ ...p, amount: -p.amount })),
        },
        { expenseDate: new Date('2026-01-02T12:00:00Z') },
        { cronExpression: '0 0 1 1 *' },
        { participants: [...input.participants, { userId: outsider.id, amount: 0n }] },
      ]) {
        await expect(
          caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, ...changes }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(await accountingSnapshot()).toEqual(after);
      }
      expect(await db.job.count()).toBe(0);
    },
  );

  it('does not overwrite a concurrent edit after comparing the historical balances', async () => {
    const { owner, member, input } = await testScenario();
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
    const readExpense = db.expense.findUnique.bind(db.expense);
    const read = jest.spyOn(db.expense, 'findUnique');
    let afterWinningEdit: Awaited<ReturnType<typeof accountingSnapshot>> | null = null;
    read.mockImplementationOnce((async (args: Parameters<typeof readExpense>[0]) => {
      const stored = await readExpense(args);
      await db.expense.update({
        where: { id: expense!.id },
        data: {
          amount: 4000n,
          updatedAt: new Date(stored!.updatedAt.getTime() + 1000),
          expenseParticipants: {
            updateMany: [
              { where: { userId: owner.id }, data: { amount: 2000n } },
              { where: { userId: member.id }, data: { amount: -2000n } },
            ],
          },
        },
      });
      afterWinningEdit = await accountingSnapshot();
      return stored;
    }) as unknown as typeof db.expense.findUnique);
    try {
      await expect(
        editExpense({ ...input, expenseId: expense!.id, name: 'Stale description' }, owner.id),
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    } finally {
      read.mockRestore();
    }
    expect(afterWinningEdit).not.toBeNull();
    expect(await accountingSnapshot()).toEqual(afterWinningEdit);
  });

  it('rejects unbalanced and excessive balances on creation and edits', async () => {
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const before = await accountingSnapshot();
    for (const expenseId of [undefined, expense!.id]) {
      for (const invalid of [
        { amount: 1n },
        { participants: input.participants.map((p) => ({ ...p, amount: p.amount + 1n })) },
      ]) {
        await expect(
          caller.expense.addOrEditExpense({ ...input, ...invalid, expenseId }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(await accountingSnapshot()).toEqual(before);
      }
    }
  });

  it.each(['sender', 'receiver'] as const)(
    'rejects outside conversion %s without changing either record',
    async (role) => {
      const { owner, member, outsider, group } = await testScenario();
      const caller = callerFor(owner.id);
      const input = {
        amount: 1000n,
        from: 'USD',
        to: 'EUR',
        rate: 0.9,
        senderId: owner.id,
        receiverId: member.id,
        groupId: group.id,
      };
      await caller.expense.addOrEditCurrencyConversion(input);
      const expense = await db.expense.findFirstOrThrow({
        where: { conversionToId: { not: null } },
      });
      const before = await accountingSnapshot();
      for (const expenseId of [undefined, expense.id]) {
        await expect(
          caller.expense.addOrEditCurrencyConversion({
            ...input,
            expenseId,
            ...('sender' === role ? { senderId: outsider.id } : { receiverId: outsider.id }),
          }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(await accountingSnapshot()).toEqual(before);
      }
    },
  );

  it('keeps the existing sequential batch behavior on a membership failure', async () => {
    const { owner, outsider, input } = await testScenario();
    await expect(
      callerFor(owner.id).expense.addOrEditExpense([
        input,
        { ...input, participants: [...input.participants, { userId: outsider.id, amount: 0n }] },
        { ...input, name: 'Must not be saved' },
      ]),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await db.expense.count()).toBe(1);
    expect(await db.expenseParticipant.count({ where: { userId: outsider.id } })).toBe(0);
    expect(await db.balanceView.count({ where: { userId: outsider.id } })).toBe(0);
  });

  it('persists a refund with reversed balances', async () => {
    const { owner, member, input } = await testScenario();
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense({
      ...input,
      amount: -input.amount,
      participants: input.participants.map((p) => ({ ...p, amount: -p.amount })),
    });
    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      amount: -2000n,
    });
    expect(await db.balanceView.findFirst({ where: { userId: member.id } })).toMatchObject({
      amount: 1000n,
    });
  });

  it('rejects converted amounts outside the database range', async () => {
    const { owner, member, group } = await testScenario();
    const before = await accountingSnapshot();
    await expect(
      callerFor(owner.id).expense.addOrEditCurrencyConversion({
        amount: 9_223_372_036_854_775_807n,
        from: 'USD',
        to: 'EUR',
        rate: 2,
        senderId: owner.id,
        receiverId: member.id,
        groupId: group.id,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await accountingSnapshot()).toEqual(before);
  });
});
