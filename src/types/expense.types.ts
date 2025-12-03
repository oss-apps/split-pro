import { type Expense, type ExpenseParticipant, SplitType } from '@prisma/client';
import { type ZodTypeAny, z } from 'zod';

/**
 * Converts a schema to accept both a single value and an array of values.
 * If a single value is provided, it will be wrapped in an array.
 * If an array is provided, it will be validated as-is.
 */
export const arrayify = <T extends ZodTypeAny>(schema: T) =>
  z.preprocess((val) => (Array.isArray(val) ? val : [val]), z.array(schema));

export type CreateExpense = Omit<
  Expense,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'addedBy'
  | 'updatedBy'
  | 'deletedBy'
  | 'expenseDate'
  | 'fileKey'
  | 'transactionId'
  | 'conversionToId'
  | 'recurrenceId'
> & {
  expenseDate?: Date;
  fileKey?: string;
  expenseId?: string;
  transactionId?: string;
  participants: Omit<ExpenseParticipant, 'expenseId'>[];
};

export const createExpenseSchema = z.object({
  paidBy: z.number(),
  name: z.string(),
  category: z.string(),
  amount: z.bigint(),
  groupId: z.number().nullable(),
  splitType: z.enum([
    SplitType.ADJUSTMENT,
    SplitType.EQUAL,
    SplitType.PERCENTAGE,
    SplitType.SHARE,
    SplitType.EXACT,
    SplitType.SETTLEMENT,
    SplitType.CURRENCY_CONVERSION,
  ]),
  currency: z.string(),
  participants: z.array(z.object({ userId: z.number(), amount: z.bigint() })),
  fileKey: z.string().optional(),
  transactionId: z.string().optional(),
  expenseDate: z.date().optional(),
  expenseId: z.string().optional(),
  conversionToId: z.string().optional(),
  cronExpression: z.string().optional(),
}) satisfies z.ZodType<CreateExpense>;

export const createCurrencyConversionSchema = z.object({
  amount: z.bigint(),
  from: z.string(),
  to: z.string(),
  rate: z.number().positive(),
  senderId: z.number(),
  receiverId: z.number(),
  groupId: z.number().nullable(),
  expenseId: z.string().optional(),
  otherExpenseId: z.string().optional(),
});

export const getCurrencyRateSchema = z.object({
  from: z.string(),
  to: z.string(),
  date: z.date().transform((date) => new Date(date.toDateString())),
});

export const getBatchCurrencyRatesSchema = getCurrencyRateSchema.extend({
  from: z.array(z.string()),
});
