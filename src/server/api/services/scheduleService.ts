import { db } from '~/server/db';

export const createRecurringDeleteBankCacheJob = async (frequency: 'weekly' | 'monthly') => {
  // Implementation for creating a recurring delete bank cache using pg_cron

  if (frequency === 'weekly') {
    await db.$executeRaw`
    SELECT cron.schedule('cleanup_cached_bank_data', '0 2 * * 0', $$
    DELETE FROM "CachedBankData"
    WHERE "lastFetched" < NOW() - INTERVAL '2 days'
    $$);
  `;
  }
  if (frequency === 'monthly') {
    await db.$executeRaw`
    SELECT cron.schedule('cleanup_cached_bank_data', '0 2 1 * *', $$
    DELETE FROM "CachedBankData"
    WHERE "lastFetched" < NOW() - INTERVAL '2 days'
    $$);
  `;
  }
};

export const createRecurringExpenseJob = async (
  expenseId: string,
  cronExpression: string,
) => db.$queryRaw<[{ schedule: bigint }]>`
SELECT cron.schedule(
${expenseId}, 
${cronExpression.replaceAll('L', '$')}, 
$$ SELECT duplicate_expense_with_participants(${expenseId}::UUID); $$
);`;
