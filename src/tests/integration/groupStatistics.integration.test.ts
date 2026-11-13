import { expenseInput, testGroup, testUser } from './factories';
import { callerFor } from './trpc';

describe('group statistics', () => {
  it('leaves currency conversions out and lists members without expenses', async () => {
    const owner = await testUser('Owner');
    const member = await testUser('Member');
    const idle = await testUser('Idle');
    const group = await testGroup(owner.id, [member.id, idle.id]);
    const caller = callerFor(owner.id);
    await caller.expense.addOrEditExpense(expenseInput(owner.id, member.id, { groupId: group.id }));
    await caller.expense.addOrEditCurrencyConversion({
      amount: 1000n,
      rate: 0.9,
      from: 'USD',
      to: 'EUR',
      senderId: owner.id,
      receiverId: member.id,
      groupId: group.id,
    });

    expect(await caller.group.getGroupTotals({ groupId: group.id })).toEqual([
      expect.objectContaining({ currency: 'USD', _sum: { amount: 2000n } }),
    ]);

    const { currencies, members } = await caller.group.getGroupMemberTotals({
      groupId: group.id,
    });
    expect(currencies).toEqual(['USD']);
    expect(
      members
        .map(({ user, totals }) => ({ userId: user.id, totals }))
        .sort((a, b) => a.userId - b.userId),
    ).toEqual(
      [
        { userId: owner.id, totals: [{ currency: 'USD', paid: 2000n, share: 1000n }] },
        { userId: member.id, totals: [{ currency: 'USD', paid: 0n, share: 1000n }] },
        { userId: idle.id, totals: [] },
      ].sort((a, b) => a.userId - b.userId),
    );
  });
});
