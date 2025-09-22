import { db } from '~/server/db';

export const createRecurringDeleteBankCacheJob = async () => {
  // Implementation for creating a recurring delete bank cache using pg_cron

  await db.$executeRaw`
    SELECT cron.schedule('cleanup_cached_bank_data_daily', '0 2 * * *', $$
    DELETE FROM "CachedBankData"
    WHERE "lastFetched" < NOW() - INTERVAL '2 days'
    $$);
  `;
};
