import { SplitType } from '@prisma/client';
import { TRPCError } from '@trpc/server';

jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

jest.mock('~/server/db', () => ({
  db: {
    $transaction: jest.fn(),
    expense: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    expenseParticipant: {
      deleteMany: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    groupUser: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('~/server/api/services/notificationService', () => ({
  sendExpensePushNotification: jest.fn().mockResolvedValue(undefined),
}));

import { sendExpensePushNotification } from '~/server/api/services/notificationService';
import { db } from '~/server/db';

import { assertExpenseGroupReassignment, editExpense } from '~/server/api/services/splitService';

const expenseId = 'expense-1';
const participants = [
  { userId: 1, amount: 100n },
  { userId: 2, amount: -100n },
];

const editableExpense = {
  expenseId,
  paidBy: 1,
  name: 'Dinner',
  category: 'general',
  amount: 100n,
  splitType: SplitType.EQUAL,
  currency: 'USD',
  participants,
};

let storedGroupId: number | null = null;

const mockExpenseLookup = (args: {
  include?: { expenseParticipants?: boolean };
  select?: { groupId?: boolean };
}) => {
  if (args.include?.expenseParticipants) {
    return Promise.resolve({
      id: expenseId,
      groupId: null,
      conversionToId: null,
      recurrence: null,
      expenseParticipants: [],
    });
  }

  if (args.select?.groupId) {
    return Promise.resolve({ groupId: storedGroupId });
  }

  return Promise.resolve(null);
};

describe('splitService', () => {
  beforeEach(() => {
    storedGroupId = null;
    (db.$transaction as jest.Mock).mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    (db.expenseParticipant.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    (db.expense.update as jest.Mock).mockResolvedValue({ id: expenseId });
    (db.group.findUnique as jest.Mock).mockReset();
    (db.groupUser.findMany as jest.Mock).mockReset();
    (db.expense.findUnique as jest.Mock).mockImplementation(mockExpenseLookup);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('editExpense', () => {
    it('persists a group assignment, payer, and participant amounts', async () => {
      await editExpense({ ...editableExpense, groupId: 12 }, 1);

      expect((db.expense.update as jest.Mock).mock.calls[0]?.[0]).toEqual({
        where: { id: expenseId },
        data: expect.objectContaining({
          groupId: 12,
          paidBy: 1,
          expenseParticipants: { create: participants },
        }),
      });

      const updatePromise = (db.expense.update as jest.Mock).mock.results[0]?.value;
      expect((db.$transaction as jest.Mock).mock.calls[0]?.[0]).toContain(updatePromise);
      expect(sendExpensePushNotification).toHaveBeenCalledWith(expenseId);
    });

    it('writes groupId null when the caller passes null', async () => {
      await editExpense({ ...editableExpense, groupId: null }, 1);

      const updateData = (db.expense.update as jest.Mock).mock.calls[0]?.[0].data as {
        groupId?: number | null;
      };
      expect(updateData).toHaveProperty('groupId', null);
    });
  });

  describe('assertExpenseGroupReassignment', () => {
    it.each([
      { stored: 12, submitted: 12 },
      { stored: null, submitted: null },
    ])(
      'resolves without a membership query when the stored group is $stored and the submitted group is $submitted',
      async ({ stored, submitted }) => {
        storedGroupId = stored;

        await expect(
          assertExpenseGroupReassignment(expenseId, submitted, 1, 1, [1, 2]),
        ).resolves.toBeUndefined();
        expect((db.groupUser.findMany as jest.Mock).mock.calls).toHaveLength(0);
      },
    );

    it('resolves when an ungrouped expense is assigned to a group that includes every user', async () => {
      (db.group.findUnique as jest.Mock).mockResolvedValue({ archivedAt: null });
      (db.groupUser.findMany as jest.Mock).mockResolvedValue([{ userId: 1 }, { userId: 2 }]);

      await expect(
        assertExpenseGroupReassignment(expenseId, 12, 1, 1, [1, 2]),
      ).resolves.toBeUndefined();
    });

    it.each([12, null])(
      'rejects changing group 5 to %p without querying membership',
      async (submitted) => {
        storedGroupId = 5;

        const assertion = assertExpenseGroupReassignment(expenseId, submitted, 1, 1, [1, 2]);

        await expect(assertion).rejects.toBeInstanceOf(TRPCError);
        await expect(assertion).rejects.toMatchObject({
          code: 'BAD_REQUEST',
          message: 'Cannot change group while editing',
        });
        expect((db.groupUser.findMany as jest.Mock).mock.calls).toHaveLength(0);
      },
    );

    it.each([
      {
        label: 'a missing group',
        group: null as { archivedAt: Date | null } | null,
        members: [] as { userId: number }[],
        paidBy: 1,
        participantUserIds: [1, 2],
        code: 'BAD_REQUEST',
        message: 'Group not found',
      },
      {
        label: 'an archived group',
        group: { archivedAt: new Date('2026-01-01T00:00:00.000Z') },
        members: [{ userId: 1 }, { userId: 2 }],
        paidBy: 1,
        participantUserIds: [1, 2],
        code: 'BAD_REQUEST',
        message: 'Group is archived',
      },
      {
        label: 'an actor who is not a member',
        group: { archivedAt: null },
        members: [{ userId: 2 }],
        paidBy: 1,
        participantUserIds: [1, 2],
        code: 'FORBIDDEN',
        message: 'Not a group member',
      },
      {
        label: 'a payer who is not a member',
        group: { archivedAt: null },
        members: [{ userId: 1 }, { userId: 2 }],
        paidBy: 3,
        participantUserIds: [1, 2],
        code: 'BAD_REQUEST',
        message: 'Payer is not a member of the group',
      },
      {
        label: 'a participant who is not a member',
        group: { archivedAt: null },
        members: [{ userId: 1 }],
        paidBy: 1,
        participantUserIds: [1, 2],
        code: 'BAD_REQUEST',
        message: 'Participant is not a member of the group',
      },
    ])('rejects $label', async ({ group, members, paidBy, participantUserIds, code, message }) => {
      (db.group.findUnique as jest.Mock).mockResolvedValue(group);
      (db.groupUser.findMany as jest.Mock).mockResolvedValue(members);

      const assertion = assertExpenseGroupReassignment(
        expenseId,
        12,
        1,
        paidBy,
        participantUserIds,
      );

      await expect(assertion).rejects.toBeInstanceOf(TRPCError);
      await expect(assertion).rejects.toMatchObject({ code, message });
    });

    it('rejects a missing expense', async () => {
      (db.expense.findUnique as jest.Mock).mockResolvedValue(null);

      const assertion = assertExpenseGroupReassignment(expenseId, 12, 1, 1, [1, 2]);

      await expect(assertion).rejects.toBeInstanceOf(TRPCError);
      await expect(assertion).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Expense not found',
      });
    });
  });
});
