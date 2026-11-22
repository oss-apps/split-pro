import { SplitType } from '@prisma/client';

import { expenseInput } from '~/tests/helpers/databaseFactories';

import { createCurrencyConversionSchema, createExpenseSchema } from './expense.types';

const input = expenseInput(1, 2);

describe('expense accounting validation', () => {
  it.each(Object.values(SplitType))('accepts balanced %s expenses and refunds', (splitType) => {
    expect(createExpenseSchema.safeParse({ ...input, splitType }).success).toBe(true);
    expect(
      createExpenseSchema.safeParse({
        ...input,
        splitType,
        amount: -input.amount,
        participants: input.participants.map((p) => ({ ...p, amount: -p.amount })),
      }).success,
    ).toBe(true);
  });

  it.each([
    { participants: [] },
    { participants: [{ userId: 1, amount: 1n }] },
    {
      participants: [
        { userId: 1, amount: 0n },
        { userId: 1, amount: 0n },
      ],
    },
    { amount: 10n },
    { amount: 0n },
    {
      participants: [
        { userId: 1, amount: -1000n },
        { userId: 2, amount: 1000n },
      ],
    },
    { paidBy: 1.5 },
    { groupId: -1 },
    { currency: 'INVALID' },
    { amount: 9_223_372_036_854_775_808n },
    { participants: [{ userId: -1, amount: 0n }] },
    { participants: [{ userId: 1, amount: 9_223_372_036_854_775_808n }] },
  ])('rejects malformed accounting: %p', (overrides) => {
    expect(createExpenseSchema.safeParse({ ...input, ...overrides }).success).toBe(false);
  });

  it('accepts personal expenses, zero shares, rounding and large BigInts', () => {
    expect(
      createExpenseSchema.safeParse({ ...input, participants: [{ userId: 1, amount: 0n }] })
        .success,
    ).toBe(true);
    expect(
      createExpenseSchema.safeParse({
        ...input,
        amount: 0n,
        participants: [{ userId: 1, amount: 0n }],
      }).success,
    ).toBe(true);
    expect(
      createExpenseSchema.safeParse({
        ...input,
        participants: [
          { userId: 1, amount: 2000n },
          { userId: 2, amount: -2000n },
        ],
      }).success,
    ).toBe(true);
    expect(createExpenseSchema.safeParse(expenseInput(1, 2, { amount: 2001n })).success).toBe(true);
    expect(
      createExpenseSchema.safeParse(expenseInput(1, 2, { amount: 18_014_398_509_481_986n }))
        .success,
    ).toBe(true);
  });
});

describe('currency conversion validation', () => {
  const conversion = {
    amount: 100n,
    from: 'USD',
    to: 'EUR',
    rate: 0.9,
    senderId: 1,
    receiverId: 2,
    groupId: null,
  };
  it.each([
    { rate: Infinity },
    { rate: NaN },
    { rate: 0 },
    { rate: -1 },
    { receiverId: 1 },
    { senderId: -1 },
    { amount: 9_223_372_036_854_775_808n },
  ])('rejects invalid conversions: %p', (overrides) => {
    expect(createCurrencyConversionSchema.safeParse({ ...conversion, ...overrides }).success).toBe(
      false,
    );
  });
});
