import { getBalances } from '~/server/api/services/balanceService';

import { db } from './database';
import { expenseInput, testScenario } from './factories';
import { callerFor } from './trpc';

const now = new Date('2025-03-09T12:00:00Z');

describe('date-aware balances (#604)', () => {
  it('keeps Prisma aggregation exact above the JavaScript safe integer range', async () => {
    const { owner, member, group } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    await viewer.expense.addOrEditExpense(
      expenseInput(owner.id, member.id, {
        groupId: group.id,
        amount: 18014398509481986n,
        expenseDate: now,
      }),
    );
    expect((await viewer.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(
      9007199254740993n,
    );
  });

  it('dates settlements and both legs of a currency conversion consistently', async () => {
    const { owner, member, group, input } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    await viewer.expense.addOrEditExpense({ ...input, expenseDate: now });
    await callerFor(member.id).expense.addOrEditExpense({
      ...expenseInput(member.id, owner.id, { groupId: group.id }),
      splitType: SplitType.SETTLEMENT,
      expenseDate: new Date('2025-04-01'),
    });
    expect((await viewer.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(
      1000n,
    );
    expect(
      (await getBalances(db, { where: { groupId: group.id, userId: owner.id } }))[0]?.amount,
    ).toBe(0n);
    await viewer.expense.addOrEditCurrencyConversion({
      amount: 1000n,
      rate: 0.9,
      from: 'USD',
      to: 'EUR',
      senderId: owner.id,
      receiverId: member.id,
      groupId: group.id,
    });
    // Align both linked legs to a deterministic future date after the real-time write.
    await db.expense.updateMany({
      where: { splitType: SplitType.CURRENCY_CONVERSION },
      data: { expenseDate: new Date('2025-04-01') },
    });
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([
      expect.objectContaining({ currency: 'USD', amount: 1000n }),
    ]);
    const due = callerFor(owner.id, { now: new Date('2025-04-01') });
    expect(await due.user.getBalancesWithFriend({ friendId: member.id })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currency: 'USD', amount: 1000n }),
        expect.objectContaining({ currency: 'EUR', amount: -900n }),
      ]),
    );
  });

  it('filters before summing, respects viewer-local days and exposes optional ranges', async () => {
    const { owner, member, group } = await testScenario();
    const viewer = callerFor(owner.id, { timeZone: 'America/New_York', now });
    const dates = [
      '2025-03-08T12:00:00Z',
      '2025-03-09T05:00:00Z',
      '2025-03-10T03:59:59.999Z',
      '2025-03-10T04:00:00Z',
    ];
    await dates.reduce(async (pending, date) => {
      await pending;
      await viewer.expense.addOrEditExpense(
        expenseInput(owner.id, member.id, {
          groupId: group.id,
          expenseDate: new Date(date),
        }),
      );
    }, Promise.resolve());
    expect((await viewer.expense.getBalances()).balances[0]?.currencies).toEqual([
      { currency: 'USD', amount: 3000n },
    ]);
    expect(await viewer.expense.getCumulatedBalances()).toEqual({
      youOwe: [],
      youGet: [{ currency: 'USD', amount: 3000n }],
    });
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([
      expect.objectContaining({ amount: 3000n, groupId: group.id }),
    ]);
    expect((await viewer.group.getAllGroupsWithBalances())[0]?.balances).toEqual({ USD: 3000n });
    expect((await viewer.group.getGroupDetails({ groupId: group.id }))?.groupBalances).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: owner.id, amount: 3000n })]),
    );
    const period = {
      fromDate: new Date('2025-03-09T05:00:00Z'),
      toDateExclusive: new Date('2025-03-10T04:00:00Z'),
    };
    expect(
      (await viewer.user.getBalancesWithFriend({ friendId: member.id, ...period }))[0]?.amount,
    ).toBe(2000n);
    const utc = callerFor(owner.id, { timeZone: 'UTC', now });
    expect((await utc.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(2000n);
    const tomorrow = callerFor(owner.id, {
      timeZone: 'America/New_York',
      now: period.toDateExclusive,
    });
    expect((await tomorrow.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(
      4000n,
    );
    expect(
      (await getBalances(db, { where: { groupId: group.id, userId: owner.id } }))[0]?.amount,
    ).toBe(4000n);
    await expect(
      viewer.expense.getBalances({ fromDate: now, toDateExclusive: now }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('retains future obligations for mutation guards and friend discovery', async () => {
    const { owner, member, group, input } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    await viewer.expense.addOrEditExpense({ ...input, expenseDate: new Date('2025-04-01') });
    expect((await viewer.expense.getBalances()).balances).toEqual([]);
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([]);
    expect(await viewer.user.getFriends()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: member.id })]),
    );
    await expect(viewer.user.deleteFriend({ friendId: member.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(viewer.group.leaveGroup({ groupId: group.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(viewer.group.toggleArchive({ groupId: group.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(viewer.group.delete({ groupId: group.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('keeps a future recurring template out of balances until its expense day', async () => {
    const { owner, member, input } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    await viewer.expense.addOrEditExpense({
      ...input,
      expenseDate: new Date('2025-04-30T12:00:00Z'),
      cronExpression: '0 0 30 * *',
    });
    expect(await db.expenseRecurrence.count()).toBe(1);
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([]);
    const due = callerFor(owner.id, { now: new Date('2025-04-30T00:00:00Z') });
    expect((await due.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(1000n);
  });

  it('recomputes edited/deleted contributions and retains a zero net row', async () => {
    const { owner, member, input } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    const current = { ...input, expenseDate: new Date('2025-03-09T12:00:00Z') };
    const [expense] = await viewer.expense.addOrEditExpense(current);
    await viewer.expense.addOrEditExpense({
      ...current,
      expenseId: expense!.id,
      expenseDate: new Date('2025-04-01'),
    });
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([]);
    await viewer.expense.addOrEditExpense({ ...current, expenseId: expense!.id });
    await callerFor(member.id).expense.addOrEditExpense(
      expenseInput(member.id, owner.id, {
        groupId: input.groupId,
        expenseDate: current.expenseDate,
      }),
    );
    expect(
      (
        await getBalances(db, {
          where: { userId: owner.id },
          toDateExclusive: new Date('2025-03-10'),
        })
      )[0]?.amount,
    ).toBe(0n);
    expect(await viewer.user.getBalancesWithFriend({ friendId: member.id })).toEqual([]);
    await viewer.expense.deleteExpense({ expenseId: expense!.id });
    expect((await viewer.user.getBalancesWithFriend({ friendId: member.id }))[0]?.amount).toBe(
      -1000n,
    );
  });

  it('simplifies the complete group graph at one cutoff, including newly implied friends', async () => {
    const { owner, member, outsider, group } = await testScenario();
    const viewer = callerFor(owner.id, { now });
    await viewer.group.addMembers({ groupId: group.id, userIds: [outsider.id] });
    await viewer.expense.addOrEditExpense(
      expenseInput(owner.id, member.id, {
        groupId: group.id,
        expenseDate: now,
      }),
    );
    await callerFor(member.id).expense.addOrEditExpense(
      expenseInput(member.id, outsider.id, {
        groupId: group.id,
        expenseDate: now,
      }),
    );
    await callerFor(outsider.id).expense.addOrEditExpense(
      expenseInput(outsider.id, owner.id, {
        groupId: group.id,
        expenseDate: new Date('2025-04-01'),
      }),
    );
    await viewer.group.toggleSimplifyDebts({ groupId: group.id });
    const details = await viewer.group.getGroupDetails({ groupId: group.id });
    expect(details?.groupBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.id, friendId: outsider.id, amount: 1000n }),
      ]),
    );
    expect((await viewer.expense.getBalances()).balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          friendId: outsider.id,
          currencies: [{ currency: 'USD', amount: 1000n }],
        }),
      ]),
    );
    expect((await viewer.user.getBalancesWithFriend({ friendId: outsider.id }))[0]?.amount).toBe(
      1000n,
    );
  });
});
import { SplitType } from '@prisma/client';
