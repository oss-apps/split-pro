import { Prisma } from '@prisma/client';
import { type AdapterAccount } from 'next-auth/adapters';

const ACCOUNT_FIELDS = new Set<string>(Object.values(Prisma.AccountScalarFieldEnum));

export const sanitiseAdapterAccount = (account: AdapterAccount): AdapterAccount => ({
  ...Object.fromEntries(Object.entries(account).filter(([key]) => ACCOUNT_FIELDS.has(key))),
  userId: account.userId,
  type: account.type,
  provider: account.provider,
  providerAccountId: account.providerAccountId,
});
