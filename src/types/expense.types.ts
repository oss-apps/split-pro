import { isCurrencyCode } from '~/lib/currency';
import { cronToBackend } from '~/lib/cron';
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
  initialComment?: string;
  expenseDate?: Date;
  fileKey?: string;
  expenseId?: string;
  transactionId?: string;
  participants: Omit<ExpenseParticipant, 'expenseId'>[];
};

const userIdSchema = z.number().int().positive().max(2_147_483_647);
const MAX_EXPENSE_AMOUNT = 9_223_372_036_854_775_807n;
export const expenseAmountSchema = z.bigint().min(-MAX_EXPENSE_AMOUNT).max(MAX_EXPENSE_AMOUNT);

export const createExpenseSchema = z
  .object({
    initialComment: z.string().trim().max(5000).optional(),
    paidBy: userIdSchema,
    name: z.string(),
    category: z.string(),
    amount: expenseAmountSchema,
    groupId: userIdSchema.nullable(),
    splitType: z.enum([
      SplitType.ADJUSTMENT,
      SplitType.EQUAL,
      SplitType.PERCENTAGE,
      SplitType.SHARE,
      SplitType.EXACT,
      SplitType.SETTLEMENT,
      SplitType.CURRENCY_CONVERSION,
    ]),
    currency: z.string().refine(isCurrencyCode, 'Invalid currency code'),
    participants: z.array(z.object({ userId: userIdSchema, amount: expenseAmountSchema })).min(1),
    fileKey: z.string().optional(),
    transactionId: z.string().optional(),
    expenseDate: z.date().optional(),
    expenseId: z.string().optional(),
    conversionToId: z.string().optional(),
    cronExpression: z
      .string()
      .transform((value) => (value ? cronToBackend(value) : ''))
      .optional(),
  })
  .superRefine(({ amount, paidBy, participants }, ctx) => {
    const ids = participants.map(({ userId }) => userId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: 'Duplicate participants',
      });
    }
    if (0n !== participants.reduce((sum, participant) => sum + participant.amount, 0n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: 'Participant balances must sum to zero',
      });
    }
    // Recover each cost share from the net balance, including refunds with reversed signs.
    const sign = amount < 0n ? -1n : 1n;
    const total = amount * sign;
    if (
      participants.some((participant) => {
        const share =
          (participant.userId === paidBy ? amount - participant.amount : -participant.amount) *
          sign;
        return share < 0n || share > total;
      })
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['participants'],
        message: 'Participant shares do not match the expense amount',
      });
    }
  }) satisfies z.ZodType<CreateExpense>;

export const createCurrencyConversionSchema = z
  .object({
    amount: expenseAmountSchema,
    from: z.string(),
    to: z.string(),
    rate: z.number().finite().positive(),
    senderId: userIdSchema,
    receiverId: userIdSchema,
    groupId: userIdSchema.nullable(),
    expenseId: z.string().optional(),
    otherExpenseId: z.string().optional(),
  })
  .refine(({ senderId, receiverId }) => senderId !== receiverId, {
    message: 'Sender and receiver must be different users',
    path: ['receiverId'],
  });

export const getCurrencyRateSchema = z.object({
  from: z.string(),
  to: z.string(),
  date: z.date().transform((date) => new Date(date.toDateString())),
});

export const getBatchCurrencyRatesSchema = getCurrencyRateSchema.extend({
  from: z.array(z.string()),
});
