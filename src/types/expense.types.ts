import { type Expense, type ExpenseParticipant, SplitType } from '@prisma/client';
import { z } from 'zod';

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
> & {
  expenseDate?: Date;
  fileKey?: string;
  expenseId?: string;
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
    SplitType.CURRENCY_EXCHANGE,
  ]),
  currency: z.string(),
  participants: z.array(z.object({ userId: z.number(), amount: z.bigint() })),
  fileKey: z.string().optional(),
  expenseDate: z.date().optional(),
  expenseId: z.string().optional(),
}) satisfies z.ZodType<CreateExpense>;
