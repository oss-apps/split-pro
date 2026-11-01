import { db } from './database';
import { testScenario } from './factories';
import { callerFor } from './trpc';

describe('expense history pagination', () => {
  it('pages activity, friend and group histories across tied dates without gaps or duplicates', async () => {
    const { owner, member, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    const date = new Date('2025-01-01T12:00:00Z');
    const created = await caller.expense.addOrEditExpense(
      Array.from({ length: 5 }, (_, index) => ({
        ...input,
        name: `Expense ${index}`,
        expenseDate: date,
      })),
    );
    await db.expense.updateMany({ data: { createdAt: date } });
    const expectedIds = created
      .map(({ id }) => id)
      .sort()
      .reverse();

    const groupFirst = await caller.expense.getGroupExpenses({ groupId: group.id, limit: 2 });
    const friendFirst = await caller.expense.getExpensesWithFriend({
      friendId: member.id,
      limit: 2,
    });
    const activityFirst = await caller.expense.getAllExpenses({ limit: 2 });
    expect(groupFirst.items.map(({ id }) => id)).toEqual(expectedIds.slice(0, 2));
    expect(friendFirst.items.map(({ id }) => id)).toEqual(expectedIds.slice(0, 2));
    expect(activityFirst.items.map(({ expenseId }) => expenseId)).toEqual(expectedIds.slice(0, 2));

    // The cursor is a value boundary, so removing its row must not break traversal.
    await db.expense.delete({ where: { id: expectedIds[1] } });
    const groupSecond = await caller.expense.getGroupExpenses({
      groupId: group.id,
      limit: 2,
      cursor: groupFirst.nextCursor,
    });
    const friendSecond = await caller.expense.getExpensesWithFriend({
      friendId: member.id,
      limit: 2,
      cursor: friendFirst.nextCursor,
    });
    const activitySecond = await caller.expense.getAllExpenses({
      limit: 2,
      cursor: activityFirst.nextCursor,
    });
    expect(groupSecond.items.map(({ id }) => id)).toEqual(expectedIds.slice(2, 4));
    expect(friendSecond.items.map(({ id }) => id)).toEqual(expectedIds.slice(2, 4));
    expect(activitySecond.items.map(({ expenseId }) => expenseId)).toEqual(expectedIds.slice(2, 4));

    const last = await caller.expense.getGroupExpenses({
      groupId: group.id,
      limit: 2,
      cursor: groupSecond.nextCursor,
    });
    expect(last.items.map(({ id }) => id)).toEqual(expectedIds.slice(4));
    expect(last.nextCursor).toBeUndefined();
    expect((await callerFor(member.id).expense.getAllExpenses({ limit: 100 })).items).toHaveLength(
      4,
    );
  });

  it('keeps deletion and authorization rules on every page and caps page sizes', async () => {
    const { owner, member, outsider, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    await caller.expense.deleteExpense({ expenseId: expense!.id });
    expect((await caller.expense.getGroupExpenses({ groupId: group.id })).items).toEqual([]);
    expect((await caller.expense.getExpensesWithFriend({ friendId: member.id })).items).toEqual([]);
    expect((await caller.expense.getAllExpenses({})).items).toHaveLength(1);
    expect((await callerFor(outsider.id).expense.getAllExpenses({})).items).toEqual([]);
    expect(
      (await callerFor(outsider.id).expense.getExpensesWithFriend({ friendId: member.id })).items,
    ).toEqual([]);
    await expect(
      callerFor(outsider.id).expense.getGroupExpenses({
        groupId: group.id,
        cursor: { date: new Date(), id: expense!.id },
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.expense.getAllExpenses({ limit: 101 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(caller.expense.getAllExpenses({ limit: 0 })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});
