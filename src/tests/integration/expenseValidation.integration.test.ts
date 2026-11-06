// Check each rejected write and its snapshot before sending the next request.
// oxlint-disable no-await-in-loop
import { db } from './database';
import { accountingSnapshot, testScenario } from './factories';
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
