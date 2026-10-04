import { db } from './database';
import { accountingSnapshot, testGroup, testScenario } from './factories';
import { callerFor } from './trpc';

describe('authorization', () => {
  it('rejects unauthenticated queries and mutations', async () => {
    await expect(callerFor(null).group.getAllGroups()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(callerFor(null).group.create({ name: 'Forbidden' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(await db.group.count()).toBe(0);
  });

  it('rejects outsider group reads and membership mutations', async () => {
    const { owner, outsider, group, input } = await testScenario();
    const caller = callerFor(outsider.id);
    await expect(caller.group.getGroupDetails({ groupId: group.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(caller.expense.getGroupExpenses({ groupId: group.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      caller.group.addMembers({ groupId: group.id, userIds: [outsider.id] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.expense.addOrEditExpense(input)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(await callerFor(owner.id).group.getGroupDetails({ groupId: group.id })).toMatchObject({
      id: group.id,
    });
  });

  it('rejects outsider expense reads, edits and deletes without changing accounting', async () => {
    const { owner, outsider, input } = await testScenario();
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
    const before = await accountingSnapshot();
    const caller = callerFor(outsider.id);
    await expect(
      caller.expense.getExpenseDetails({ expenseId: expense!.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, name: 'Stolen' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller.expense.deleteExpense({ expenseId: expense!.id })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      name: input.name,
      deletedAt: null,
    });
    expect(await accountingSnapshot()).toEqual(before);
  });

  it('rejects writes to archived groups', async () => {
    const { owner, group, input } = await testScenario();
    const caller = callerFor(owner.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const otherGroup = await testGroup(owner.id);
    await db.group.update({ where: { id: group.id }, data: { archivedAt: new Date() } });
    const before = await accountingSnapshot();
    await expect(caller.expense.addOrEditExpense(input)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(
      caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.expense.deleteExpense({ expenseId: expense!.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(
      caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, groupId: null }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, groupId: otherGroup.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await db.expense.count()).toBe(1);
    expect(await accountingSnapshot()).toEqual(before);
  });

  it('applies the same membership, edit and archive guards to linked currency conversions', async () => {
    const { owner, member, outsider, group } = await testScenario();
    const conversion = {
      amount: 1000n,
      rate: 0.9,
      from: 'USD',
      to: 'EUR',
      senderId: owner.id,
      receiverId: member.id,
      groupId: group.id,
    };
    await expect(
      callerFor(outsider.id).expense.addOrEditCurrencyConversion(conversion),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await callerFor(owner.id).expense.addOrEditCurrencyConversion(conversion);
    const expense = await db.expense.findFirstOrThrow({ where: { conversionToId: { not: null } } });
    const before = await accountingSnapshot();
    await expect(
      callerFor(outsider.id).expense.addOrEditCurrencyConversion({
        ...conversion,
        expenseId: expense.id,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await db.group.update({ where: { id: group.id }, data: { archivedAt: new Date() } });
    await expect(
      callerFor(owner.id).expense.addOrEditCurrencyConversion(conversion),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      callerFor(owner.id).expense.addOrEditCurrencyConversion({
        ...conversion,
        expenseId: expense.id,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      callerFor(owner.id).expense.addOrEditCurrencyConversion({
        ...conversion,
        expenseId: expense.id,
        groupId: null,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await accountingSnapshot()).toEqual(before);
  });
});
