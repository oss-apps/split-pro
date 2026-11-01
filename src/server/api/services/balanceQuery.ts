import { TZDate } from '@date-fns/tz';
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

/** Calendar midnight in the browser's time zone, including daylight-saving transitions. */
export const withCurrentBalances = <T>(
  db: PrismaClient,
  timeZone: string,
  query: (tx: Prisma.TransactionClient) => Promise<T>,
  now = new Date(),
): Promise<T> => {
  // Intl accepts browser aliases that a PostgreSQL installation may not recognize.
  const cutoff = new TZDate(now, timeZone);
  cutoff.setHours(24, 0, 0, 0);
  return withBalanceCutoff(db, cutoff, query);
};
