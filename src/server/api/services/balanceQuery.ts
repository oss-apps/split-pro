import { type Prisma, type PrismaClient } from '@prisma/client';

/**
 * Run balance queries with an exclusive expense-date cutoff, or null for total balances.
 * Use the supplied transaction client for every query, including relation reads.
 */
export const withBalanceCutoff = <T>(
  db: PrismaClient,
  cutoff: Date | null,
  query: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  // PostgreSQL settings cannot store null; an empty value explicitly disables filtering.
  const cutoffIso = cutoff?.toISOString() ?? '';

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.balance_cutoff', ${cutoffIso}, true)`;
    return query(tx);
  });
};
