import { db } from './database';
import { accountingSnapshot, expenseInput, testGroup, testScenario, testUser } from './factories';
import { callerFor } from './trpc';

describe('assigning an ungrouped expense to a group', () => {
  it('persists the group when an ungrouped expense is edited into a group', async () => {
    const { owner, member, group } = await testScenario();
    const caller = callerFor(owner.id);
    const input = expenseInput(owner.id, member.id);
    const [expense] = await caller.expense.addOrEditExpense(input);

    await caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, groupId: group.id });

    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      groupId: group.id,
    });
    expect(await caller.expense.getGroupExpenses({ groupId: group.id })).toEqual([
      expect.objectContaining({ id: expense!.id }),
    ]);
    expect(
      await db.balanceView.findMany({ where: { groupId: group.id }, orderBy: { userId: 'asc' } }),
    ).toEqual([
      expect.objectContaining({ userId: owner.id, friendId: member.id, amount: 1000n }),
      expect.objectContaining({ userId: member.id, friendId: owner.id, amount: -1000n }),
    ]);
  });

  it('assigns both linked records of an ungrouped currency conversion', async () => {
    const { owner, member, group } = await testScenario();
    const conversion = {
      amount: 1000n,
      rate: 0.9,
      from: 'USD',
      to: 'EUR',
      senderId: owner.id,
      receiverId: member.id,
      groupId: null,
    };
    await callerFor(owner.id).expense.addOrEditCurrencyConversion(conversion);
    const expense = await db.expense.findFirstOrThrow({ where: { conversionToId: { not: null } } });

    await callerFor(owner.id).expense.addOrEditCurrencyConversion({
      ...conversion,
      expenseId: expense.id,
      groupId: group.id,
    });

    expect(
      (await db.expense.findMany({ select: { groupId: true } })).map(({ groupId }) => groupId),
    ).toEqual([group.id, group.id]);
  });

  it('rejects a caller who neither added nor participates in the expense', async () => {
    const { owner, member, outsider } = await testScenario();
    const outsiderGroup = await testGroup(outsider.id, [owner.id, member.id]);
    const input = expenseInput(owner.id, member.id);
    const [expense] = await callerFor(owner.id).expense.addOrEditExpense(input);
    const before = await accountingSnapshot();

    await expect(
      callerFor(outsider.id).expense.addOrEditExpense({
        ...input,
        expenseId: expense!.id,
        groupId: outsiderGroup.id,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await accountingSnapshot()).toEqual(before);
  });

  it.each([
    {
      label: 'the caller is not a member',
      payer: 'member',
      groupMembers: ['other', 'member'],
      code: 'FORBIDDEN',
      message: 'Not a group member',
    },
    {
      label: 'the payer is not a member',
      payer: 'member',
      groupMembers: ['owner'],
      code: 'BAD_REQUEST',
      message: 'Payer is not a member of the group',
    },
    {
      label: 'a participant is not a member',
      payer: 'owner',
      groupMembers: ['owner'],
      code: 'BAD_REQUEST',
      message: 'Participant is not a member of the group',
    },
  ] as const)(
    'rejects the assignment when $label',
    async ({ payer, groupMembers, code, message }) => {
      const users = {
        owner: await testUser('Owner'),
        member: await testUser('Member'),
        other: await testUser('Other'),
      };
      const otherParticipant = 'owner' === payer ? users.member : users.owner;
      const input = expenseInput(users[payer].id, otherParticipant.id);
      const [expense] = await callerFor(users.owner.id).expense.addOrEditExpense(input);
      const [groupOwner, ...rest] = groupMembers.map((name) => users[name].id);
      const group = await testGroup(groupOwner!, rest);
      const before = await accountingSnapshot();

      await expect(
        callerFor(users.owner.id).expense.addOrEditExpense({
          ...input,
          expenseId: expense!.id,
          groupId: group.id,
        }),
      ).rejects.toMatchObject({ code, message });
      expect(await accountingSnapshot()).toEqual(before);
    },
  );

  it('rejects assigning an expense to an archived group', async () => {
    const { owner, member, group } = await testScenario();
    const caller = callerFor(owner.id);
    const input = expenseInput(owner.id, member.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    await db.group.update({ where: { id: group.id }, data: { archivedAt: new Date() } });
    const before = await accountingSnapshot();

    await expect(
      caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, groupId: group.id }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Group is archived' });
    expect(await accountingSnapshot()).toEqual(before);
  });
});
