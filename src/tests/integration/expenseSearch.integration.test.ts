import { db } from './database';
import { expenseInput, testGroup, testUser } from './factories';
import { callerFor } from './trpc';

describe('expense history search', () => {
  it('filters activity, friend and group histories by name, category, group and payer', async () => {
    const owner = await testUser('Owner');
    const member = await testUser('Marta Rossi');
    const group = await testGroup(owner.id, [member.id]);
    await db.group.update({ where: { id: group.id }, data: { name: 'Ski Trip' } });
    const caller = callerFor(owner.id);

    const [pizza, rent, taxi] = await caller.expense.addOrEditExpense([
      expenseInput(owner.id, member.id, { groupId: group.id, name: 'Pizza night' }),
      expenseInput(owner.id, member.id, { name: 'Rent', category: 'Housing' }),
      expenseInput(member.id, owner.id, { name: 'Taxi', category: 'Transport' }),
    ]);

    const activityIds = async (search?: string) =>
      (await caller.expense.getAllExpenses({ search })).items.map(({ expenseId }) => expenseId);
    const friendIds = async (search?: string) =>
      (await caller.expense.getExpensesWithFriend({ friendId: member.id, search })).items.map(
        ({ id }) => id,
      );
    const groupIds = async (search?: string) =>
      (await caller.expense.getGroupExpenses({ groupId: group.id, search })).items.map(
        ({ id }) => id,
      );

    // Name, case-insensitive and partial.
    expect(await activityIds('PIZZA')).toEqual([pizza!.id]);
    expect(await friendIds('izz')).toEqual([pizza!.id]);
    expect(await groupIds('pizza')).toEqual([pizza!.id]);
    // Category.
    expect(await activityIds('housing')).toEqual([rent!.id]);
    // Group name.
    expect(await activityIds('ski')).toEqual([pizza!.id]);
    // Payer name and email.
    expect(await activityIds('marta')).toEqual([taxi!.id]);
    expect(await friendIds(member.email!.slice(0, 12))).toEqual([taxi!.id]);
    // No match, and empty/whitespace search returns everything.
    expect(await activityIds('nothing-matches')).toEqual([]);
    expect(await groupIds('rent')).toEqual([]);
    expect(await activityIds('   ')).toHaveLength(3);
    expect(await friendIds()).toHaveLength(3);
  });

  it('matches LIKE wildcards and backslashes literally', async () => {
    const owner = await testUser('Owner');
    const member = await testUser('Member');
    const caller = callerFor(owner.id);
    const [juice, underscore, backslash] = await caller.expense.addOrEditExpense(
      ['100% juice', 'a_b', 'C:\\temp', 'axb', 'Plain'].map((name) =>
        expenseInput(owner.id, member.id, { name }),
      ),
    );
    const names = async (search: string) =>
      (await caller.expense.getAllExpenses({ search })).items.map(({ expenseId }) => expenseId);

    expect(await names('%')).toEqual([juice!.id]);
    expect(await names('100%')).toEqual([juice!.id]);
    expect(await names('a_b')).toEqual([underscore!.id]);
    expect(await names('_')).toEqual([underscore!.id]);
    expect(await names('\\')).toEqual([backslash!.id]);
  });

  it('pages through search results', async () => {
    const owner = await testUser('Owner');
    const member = await testUser('Member');
    const caller = callerFor(owner.id);
    await caller.expense.addOrEditExpense(
      Array.from({ length: 5 }, (_, index) =>
        expenseInput(owner.id, member.id, {
          name: index % 2 ? `Coffee ${index}` : `Lunch ${index}`,
        }),
      ),
    );

    const first = await caller.expense.getAllExpenses({ search: 'lunch', limit: 2 });
    const second = await caller.expense.getAllExpenses({
      search: 'lunch',
      limit: 2,
      cursor: first.nextCursor,
    });
    const names = [...first.items, ...second.items].map(({ expense }) => expense.name).sort();
    expect(names).toEqual(['Lunch 0', 'Lunch 2', 'Lunch 4']);
    expect(second.nextCursor).toBeUndefined();
    await expect(caller.expense.getAllExpenses({ search: 'x'.repeat(101) })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});
