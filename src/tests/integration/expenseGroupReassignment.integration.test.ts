import { editExpense } from '~/server/api/services/splitService';

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
    expect((await caller.expense.getGroupExpenses({ groupId: group.id })).items).toEqual([
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
    expect(
      (await callerFor(owner.id).expense.getGroupExpenses({ groupId: group.id })).items,
    ).toEqual([
      expect.objectContaining({
        id: expense.id,
        groupId: group.id,
        conversionTo: expect.objectContaining({ groupId: group.id }),
      }),
    ]);
    expect(
      await db.balanceView.findMany({
        where: { groupId: group.id },
        orderBy: [{ currency: 'asc' }, { userId: 'asc' }],
      }),
    ).toEqual([
      expect.objectContaining({
        currency: 'EUR',
        userId: owner.id,
        friendId: member.id,
        amount: -900n,
      }),
      expect.objectContaining({
        currency: 'EUR',
        userId: member.id,
        friendId: owner.id,
        amount: 900n,
      }),
      expect.objectContaining({
        currency: 'USD',
        userId: owner.id,
        friendId: member.id,
        amount: 1000n,
      }),
      expect.objectContaining({
        currency: 'USD',
        userId: member.id,
        friendId: owner.id,
        amount: -1000n,
      }),
    ]);
  });

  it('rejects a conversion whose target a concurrent edit assigned to another group', async () => {
    const { owner, member, group } = await testScenario();
    const otherGroup = await testGroup(owner.id, [member.id]);
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
    const source = await db.expense.findFirstOrThrow({ where: { conversionToId: { not: null } } });
    await db.expense.update({
      where: { id: source.conversionToId! },
      data: { groupId: otherGroup.id },
    });
    const before = await accountingSnapshot();

    await expect(
      callerFor(owner.id).expense.addOrEditCurrencyConversion({
        ...conversion,
        expenseId: source.id,
        groupId: group.id,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await accountingSnapshot()).toEqual(before);
  });

  it.each(['source', 'target'] as const)(
    'rejects an ordinary edit of a conversion %s',
    async (side) => {
      const { owner, member, group } = await testScenario();
      await callerFor(owner.id).expense.addOrEditCurrencyConversion({
        amount: 1000n,
        rate: 0.9,
        from: 'USD',
        to: 'EUR',
        senderId: owner.id,
        receiverId: member.id,
        groupId: null,
      });
      const source = await db.expense.findFirstOrThrow({
        where: { conversionToId: { not: null } },
      });
      const before = await accountingSnapshot();

      await expect(
        callerFor(owner.id).expense.addOrEditExpense({
          ...expenseInput(owner.id, member.id),
          expenseId: 'source' === side ? source.id : source.conversionToId!,
          groupId: group.id,
        }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Currency conversions must be edited together',
      });
      expect(await accountingSnapshot()).toEqual(before);
    },
  );

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

  it('rejects an edit that a concurrent group assignment got to first', async () => {
    const { owner, member, group } = await testScenario();
    const otherGroup = await testGroup(owner.id, [member.id]);
    const caller = callerFor(owner.id);
    const input = expenseInput(owner.id, member.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    await caller.expense.addOrEditExpense({ ...input, expenseId: expense!.id, groupId: group.id });
    const before = await accountingSnapshot();

    // Calling editExpense directly stands in for an edit that passed validation
    // While the expense was still ungrouped.
    await expect(
      editExpense({ ...input, expenseId: expense!.id, groupId: otherGroup.id }, owner.id),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      groupId: group.id,
    });
    expect(await accountingSnapshot()).toEqual(before);
  });

  it('returns the conflict to a caller whose edit lost the group assignment', async () => {
    const { owner, member, group } = await testScenario();
    const otherGroup = await testGroup(owner.id, [member.id]);
    const caller = callerFor(owner.id);
    const input = expenseInput(owner.id, member.id);
    const [expense] = await caller.expense.addOrEditExpense(input);
    const readStoredGroup = db.expense.findUniqueOrThrow.bind(db.expense);
    const validationRead = jest.spyOn(db.expense, 'findUniqueOrThrow');
    let afterWinningEdit: Awaited<ReturnType<typeof accountingSnapshot>> | null = null;
    // The first edit lands just after the second one read the expense as ungrouped.
    validationRead.mockImplementationOnce((async (args: Parameters<typeof readStoredGroup>[0]) => {
      const stored = await readStoredGroup(args);
      await db.expense.update({ where: { id: expense!.id }, data: { groupId: group.id } });
      afterWinningEdit = await accountingSnapshot();
      return stored;
    }) as unknown as typeof db.expense.findUniqueOrThrow);

    await expect(
      caller.expense.addOrEditExpense({
        ...input,
        expenseId: expense!.id,
        groupId: otherGroup.id,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    validationRead.mockRestore();

    expect(await db.expense.findUnique({ where: { id: expense!.id } })).toMatchObject({
      groupId: group.id,
    });
    expect(afterWinningEdit).not.toBeNull();
    expect(await accountingSnapshot()).toEqual(afterWinningEdit);
  });

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
