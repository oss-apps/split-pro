import { env } from '~/env';
import { withCurrentBalances } from '~/server/api/services/balanceQuery';

import { createDatabaseExpense } from '../helpers/databaseFactories';
import { db } from './database';
import { expenseInput, testScenario } from './factories';
import { callerFor } from './trpc';

jest.mock('~/env', () => ({
  env: { ...jest.requireActual<{ env: typeof env }>('~/env').env },
}));

beforeEach(() => {
  jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', false);
});

describe('opt-in current balances', () => {
  it.each([false, true])('uses consistent balances with the flag set to %s', async (enabled) => {
    jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', enabled);
    const { owner, member, group, input } = await testScenario();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);
    await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(today.getTime() - 1),
    });
    // Later today must count even though its timestamp is still in the future.
    await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(tomorrow.getTime() - 1),
    });
    await createDatabaseExpense(db, { ...input, expenseDate: tomorrow });
    const caller = callerFor(owner.id);
    const amount = enabled ? 2000n : 3000n;

    expect(await caller.user.getBalanceSettings()).toEqual({ excludeFutureExpenses: enabled });
    expect(await caller.expense.getCumulatedBalances()).toMatchObject({
      youGet: [{ currency: 'USD', amount }],
      youOwe: [],
    });
    expect((await caller.expense.getBalances()).balances[0]?.currencies).toEqual([
      { currency: 'USD', amount },
    ]);
    expect(await caller.user.getBalancesWithFriend({ friendId: member.id })).toEqual([
      expect.objectContaining({ amount, groupId: group.id }),
    ]);
    expect(await caller.group.getAllGroupsWithBalances()).toEqual([
      expect.objectContaining({ id: group.id, balances: { USD: amount } }),
    ]);
    expect((await caller.group.getGroupDetails({ groupId: group.id }))?.groupBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.id, amount }),
        expect.objectContaining({ userId: member.id, amount: -amount }),
      ]),
    );
    expect((await caller.expense.getGroupExpenses({ groupId: group.id })).items).toHaveLength(3);
    expect(
      (await caller.expense.getExpensesWithFriend({ friendId: member.id })).items,
    ).toHaveLength(3);
    // Display queries must not leave their cutoff on the pooled connection.
    expect(await db.balanceView.findFirst({ where: { userId: owner.id } })).toMatchObject({
      amount: 3000n,
    });
  });

  it('keeps future-only friendships visible and protects outstanding future debts', async () => {
    jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', true);
    const { owner, member, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    const future = new Date(Date.now() + 7 * 86_400_000);
    await caller.expense.addOrEditExpense({ ...input, expenseDate: future });
    expect(await caller.expense.getCumulatedBalances()).toEqual({ youGet: [], youOwe: [] });
    expect(await caller.user.getBalancesWithFriend({ friendId: member.id })).toEqual([]);
    expect((await caller.group.getGroupDetails({ groupId: group.id }))?.groupBalances).toEqual([]);
    expect(await caller.user.getFriends()).toEqual([expect.objectContaining({ id: member.id })]);
    expect(await caller.user.getFriend({ friendId: member.id })).toMatchObject({ id: member.id });
    await expect(caller.user.deleteFriend({ friendId: member.id })).rejects.toThrow(
      'outstanding balances',
    );
    await expect(caller.group.leaveGroup({ groupId: group.id })).rejects.toThrow('non-zero');
    await expect(caller.group.toggleArchive({ groupId: group.id })).rejects.toThrow(
      'outstanding balances',
    );
    await expect(caller.group.delete({ groupId: group.id })).rejects.toThrow('non-zero');
  });

  it('updates balances when an expense is moved between today and a future date', async () => {
    jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', true);
    const { owner, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense({
      ...input,
      expenseDate: new Date(Date.now() + 7 * 86_400_000),
      cronExpression: '0 0 1 1 *',
    });
    expect(await caller.expense.getCumulatedBalances()).toEqual({ youGet: [], youOwe: [] });
    await caller.expense.addOrEditExpense({
      ...input,
      expenseId: expense!.id,
      expenseDate: new Date(),
      cronExpression: '0 0 1 1 *',
    });
    expect(await caller.expense.getCumulatedBalances()).toMatchObject({
      youGet: [{ amount: 1000n }],
    });
    expect(await db.expenseRecurrence.count()).toBe(1);
  });

  it('simplifies debts using the same filtered inputs as other balances', async () => {
    jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', true);
    const { owner, member, outsider, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    await caller.group.addMembers({ groupId: group.id, userIds: [outsider.id] });
    await caller.expense.addOrEditExpense(input);
    await callerFor(member.id).expense.addOrEditExpense(
      expenseInput(member.id, outsider.id, {
        groupId: group.id,
        expenseDate: new Date(Date.now() + 7 * 86_400_000),
      }),
    );
    await caller.group.toggleSimplifyDebts({ groupId: group.id });
    expect((await caller.group.getGroupDetails({ groupId: group.id }))?.groupBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.id, friendId: member.id, amount: 1000n }),
        expect.objectContaining({ userId: member.id, friendId: owner.id, amount: -1000n }),
      ]),
    );
    expect(await caller.user.getBalancesWithFriend({ friendId: member.id })).toEqual([
      expect.objectContaining({ amount: 1000n }),
    ]);
    expect((await caller.expense.getBalances()).balances[0]).toMatchObject({
      friendId: member.id,
      currencies: [{ currency: 'USD', amount: 1000n }],
    });
  });

  it.each([false, true])(
    'includes new simplified friend pairs when future exclusion is %s',
    async (enabled) => {
      jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', enabled);
      const { owner, member, outsider, group, input } = await testScenario();
      const caller = callerFor(owner.id);
      await caller.group.addMembers({ groupId: group.id, userIds: [outsider.id] });
      await caller.expense.addOrEditExpense(input);
      await callerFor(member.id).expense.addOrEditExpense(
        expenseInput(member.id, outsider.id, { groupId: group.id }),
      );
      await caller.expense.addOrEditExpense(
        expenseInput(owner.id, outsider.id, {
          groupId: group.id,
          expenseDate: new Date(Date.now() + 7 * 86_400_000),
        }),
      );
      await caller.group.toggleSimplifyDebts({ groupId: group.id });
      const amount = enabled ? 1000n : 2000n;
      const groupBalances = (await caller.group.getGroupDetails({ groupId: group.id }))!
        .groupBalances;
      expect(groupBalances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: owner.id, friendId: outsider.id, amount }),
        ]),
      );
      expect((await caller.expense.getBalances()).balances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            friendId: outsider.id,
            currencies: [{ currency: 'USD', amount }],
          }),
        ]),
      );
      expect(await caller.user.getBalancesWithFriend({ friendId: outsider.id })).toEqual([
        expect.objectContaining({ groupId: group.id, friendId: outsider.id, amount }),
      ]);
    },
  );

  it('allows opening a simplified friend balance without any direct expense', async () => {
    jest.replaceProperty(env, 'EXCLUDE_FUTURE_EXPENSES', true);
    const { owner, member, outsider, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    await caller.group.addMembers({ groupId: group.id, userIds: [outsider.id] });
    await caller.expense.addOrEditExpense(input);
    await callerFor(member.id).expense.addOrEditExpense(
      expenseInput(member.id, outsider.id, { groupId: group.id }),
    );
    expect(await caller.user.getFriend({ friendId: outsider.id })).toBeNull();
    await caller.group.toggleSimplifyDebts({ groupId: group.id });
    expect(await caller.user.getFriend({ friendId: outsider.id })).toMatchObject({
      id: outsider.id,
    });
    expect(await caller.user.getBalancesWithFriend({ friendId: outsider.id })).toEqual([
      expect.objectContaining({ friendId: outsider.id, amount: 1000n }),
    ]);
  });

  it.each([
    ['Europe/Warsaw', '2026-03-28T23:30:00Z', '2026-03-29T22:00:00Z'],
    ['Europe/Warsaw', '2026-10-24T22:30:00Z', '2026-10-25T23:00:00Z'],
    ['Asia/Kathmandu', '2026-01-01T20:00:00Z', '2026-01-02T18:15:00Z'],
    ['Asia/Katmandu', '2026-01-01T20:00:00Z', '2026-01-02T18:15:00Z'],
    ['Pacific/Honolulu', '2026-01-01T08:00:00Z', '2026-01-01T10:00:00Z'],
  ])('uses calendar midnight in %s at %s', async (timeZone, now, expectedCutoff) => {
    const { owner, input } = await testScenario();
    const cutoff = new Date(expectedCutoff);
    await createDatabaseExpense(db, {
      ...input,
      expenseDate: new Date(cutoff.getTime() - 1),
    });
    await createDatabaseExpense(db, { ...input, expenseDate: cutoff });
    expect(
      await withCurrentBalances(
        db,
        timeZone,
        (tx) => tx.balanceView.findFirst({ where: { userId: owner.id } }),
        new Date(now),
      ),
    ).toMatchObject({ amount: 1000n });
    expect(
      await withCurrentBalances(
        db,
        timeZone,
        (tx) => tx.balanceView.findFirst({ where: { userId: owner.id } }),
        cutoff,
      ),
    ).toMatchObject({ amount: 2000n });
  });
});
