import { z } from 'zod';

export const InstitutionsOutput = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    logo: z.string(),
  }),
);

export const TransactionOutputItem = z.object({
  transactionId: z.string(),
  bookingDate: z.string(),
  description: z.string(),
  transactionAmount: z.object({
    amount: z.string(),
    currency: z.string(),
  }),
});

export type TransactionOutputItem = z.infer<typeof TransactionOutputItem>;

export const TransactionOutput = z.object({
  transactions: z.object({
    booked: z.array(TransactionOutputItem),
    pending: z.array(TransactionOutputItem),
  }),
});

export type TransactionOutput = z.infer<typeof TransactionOutput>;
