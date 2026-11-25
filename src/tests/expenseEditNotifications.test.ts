jest.mock('~/env', () => ({ env: {} }));
jest.mock('~/server/db', () => ({
  db: {
    expense: { findUnique: jest.fn() },
    pushNotification: { findMany: jest.fn(), deleteMany: jest.fn() },
  },
}));
jest.mock('~/server/notification', () => ({
  pushNotification: jest.fn().mockResolvedValue({ ok: true }),
}));

import { sendExpensePushNotification } from '~/server/api/services/notificationService';
import { pushNotification } from '~/server/notification';

const { db } = jest.requireMock<{
  db: {
    expense: { findUnique: jest.Mock };
    pushNotification: { findMany: jest.Mock; deleteMany: jest.Mock };
  };
}>('~/server/db');

describe('expense edit notifications', () => {
  it('notifies the creator, zero-balance payer and removed participants, excluding the editor', async () => {
    db.expense.findUnique.mockResolvedValue({
      paidBy: 3,
      addedBy: 1,
      amount: 1000n,
      currency: 'USD',
      name: 'Dinner',
      deletedBy: null,
      splitType: 'EQUAL',
      deletedByUser: null,
      expenseParticipants: [
        { userId: 1, amount: 1000n },
        { userId: 2, amount: -1000n },
      ],
      paidByUser: { name: 'Payer', email: null },
      addedByUser: { name: 'Creator', email: null },
      updatedByUser: { name: 'Editor', email: null },
      conversionTo: null,
    });
    jest
      .mocked(db.pushNotification.findMany)
      .mockResolvedValue([{ userId: 1, subscription: 'subscription', endpoint: 'endpoint' }]);
    await sendExpensePushNotification('expense-id', 2, [1, 2, 4]);
    expect(db.pushNotification.findMany).toHaveBeenCalledWith({
      where: { userId: { in: expect.arrayContaining([1, 3, 4]) } },
    });
    const recipients = db.pushNotification.findMany.mock.calls[0]?.[0]?.where?.userId;
    expect(recipients).toEqual({ in: [3, 1, 4] });
    expect(pushNotification).toHaveBeenCalledWith(
      'subscription',
      expect.objectContaining({
        title: 'Editor',
        message: expect.stringContaining('Updated Dinner'),
        data: { url: '/expenses/expense-id' },
      }),
    );
  });
});
