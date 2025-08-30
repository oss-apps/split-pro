import { z } from 'zod';
import { env } from '~/env';

type BankProviders = 'GOCARDLESS';

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

export const isBankConnectionConfigured = () => !!whichBankConnectionConfigured();

export const whichBankConnectionConfigured = (): BankProviders | null => {
  if (env.GOCARDLESS_SECRET_ID && env.GOCARDLESS_SECRET_KEY && env.GOCARDLESS_COUNTRY) {
    return 'GOCARDLESS';
  }
  return null;
};
