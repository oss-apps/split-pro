import { db } from '~/server/db';

export const createRecurringDeleteBankCacheJob = async (
  cronExpression: string,
  interval: string,
) => {
  // Implementation for creating a recurring delete bank cache using pg_cron

  await db.$executeRaw`
      SELECT cron.schedule('cleanup_cached_bank_data', ${cronExpression}, $$
      DELETE FROM "CachedBankData"
      WHERE "lastFetched" < NOW() - INTERVAL ${interval};
      DELETE FROM "OtherTable"
      WHERE "lastFetched" < NOW() - INTERVAL ${interval};
      VACUUM;
      $$);
    `;
};

export const createRecurringExpenseJob = (expenseId: string, cronExpression: string) =>
  db.$queryRawUnsafe<[{ schedule: bigint }]>(
    `SELECT cron.schedule($1, $2, $$ SELECT duplicate_expense_with_participants('${expenseId}'::UUID); $$);`,
    expenseId,
    cronExpression,
  );
