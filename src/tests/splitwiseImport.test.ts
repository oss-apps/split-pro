const createdExpenses: { amount: bigint; expenseParticipants: { create: { userId: number; amount: bigint }[] } }[] = [];

jest.mock('~/server/db', () => ({
  db: {
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 2, email: 'friend@example.com' }]),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    expense: {
      create: jest.fn(({ data }) => {
        createdExpenses.push(data);
        return data;
      }),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  },
}));

import { importUserBalanceFromSplitWise } from '~/server/api/services/splitService';

describe('importUserBalanceFromSplitWise', () => {
  it('keeps the sign of a Splitwise balance', async () => {
    await importUserBalanceFromSplitWise(1, [
      {
        id: 10,
        first_name: 'Friend',
        last_name: '',
        email: 'friend@example.com',
        balance: [{ currency_code: 'USD', amount: '-12.50' }],
      },
    ] as never);

    expect(createdExpenses[0]!.amount).toBe(-1250n);
    expect(createdExpenses[0]!.expenseParticipants.create[1]!.amount).toBe(1250n);
  });
});
