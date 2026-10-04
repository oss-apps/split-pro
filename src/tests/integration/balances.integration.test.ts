import { db } from './database';
import { expenseInput, testGroup, testScenario } from './factories';
import { callerFor } from './trpc';

describe('balance isolation and simplification', () => {
  it('isolates groups and currencies and hides deleted expenses', async () => {
    const { owner, member, group, input } = await testScenario();
    const otherGroup = await testGroup(owner.id, [member.id]);
    const caller = callerFor(owner.id);
    const [usd] = await caller.expense.addOrEditExpense(input);
    await caller.expense.addOrEditExpense({
      ...input,
      currency: 'EUR',
      amount: 6000n,
      participants: [
        { userId: owner.id, amount: 3000n },
        { userId: member.id, amount: -3000n },
      ],
    });
    await caller.expense.addOrEditExpense({ ...input, groupId: otherGroup.id });
    expect(await db.balanceView.findMany({ where: { userId: owner.id } })).toHaveLength(3);
    await caller.expense.deleteExpense({ expenseId: usd!.id });
    expect(
      await db.balanceView.findFirst({
        where: { userId: owner.id, groupId: group.id, currency: 'EUR' },
      }),
    ).toMatchObject({ amount: 3000n });
    expect(
      await db.balanceView.findFirst({ where: { userId: owner.id, groupId: otherGroup.id } }),
    ).toMatchObject({ amount: 1000n });
    expect(
      (await caller.expense.getGroupExpenses({ groupId: group.id })).map(
        (expense) => expense.currency,
      ),
    ).toEqual(['EUR']);
  });

  it('simplifies a three-member chain while preserving every member net balance', async () => {
    const { owner, member, outsider, group } = await testScenario();
    await callerFor(owner.id).group.addMembers({ groupId: group.id, userIds: [outsider.id] });
    await callerFor(owner.id).expense.addOrEditExpense(
      expenseInput(owner.id, member.id, { groupId: group.id }),
    );
    await callerFor(member.id).expense.addOrEditExpense(
      expenseInput(member.id, outsider.id, { groupId: group.id }),
    );
    await callerFor(owner.id).group.toggleSimplifyDebts({ groupId: group.id });
    const simplified = await callerFor(owner.id).group.getGroupDetails({ groupId: group.id });
    expect(simplified?.groupBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.id, friendId: outsider.id, amount: 1000n }),
        expect.objectContaining({ userId: outsider.id, friendId: owner.id, amount: -1000n }),
      ]),
    );
    expect(simplified?.groupBalances.filter((balance) => 0n !== balance.amount)).toHaveLength(2);
    expect(
      (simplified?.groupBalances ?? []).reduce((total, balance) => total + balance.amount, 0n),
    ).toBe(0n);
  });
});
