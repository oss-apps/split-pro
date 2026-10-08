import { PrismaClient } from '@prisma/client';

import { assertTestDatabaseUrl, getTestDatabaseUrl } from '../helpers/testDatabase';

const databaseUrl = getTestDatabaseUrl();
assertTestDatabaseUrl(databaseUrl);
const clientUrl = new URL(databaseUrl);
// Keep the suite's advisory lock and all operations on one connection. A second
// Integration process must fail rather than truncate another run's fixtures.
clientUrl.searchParams.set('connection_limit', '1');
export const db = new PrismaClient({ datasourceUrl: clientUrl.toString() });

export const acquireDatabaseLock = async () => {
  const [result] = await db.$queryRaw<
    [{ locked: boolean }]
  >`SELECT pg_try_advisory_lock(55439) AS locked`;
  if (!result.locked) {
    throw new Error('Another integration suite owns this database; use a separate test cluster');
  }
};

export const resetDatabase = async () => {
  assertTestDatabaseUrl(databaseUrl);
  // All application tables, including legacy balances and metadata. The migration
  // Ledger and extension tables are deliberately outside this explicit list.
  await db.$executeRawUnsafe(`TRUNCATE TABLE
    "ExpenseParticipant", "ExpenseNote", "Expense", "ExpenseRecurrence",
    "GroupDefaultSplit", "GroupUser", "Group", "FriendDefaultSplit",
    "PushNotification", "CachedBankData", "CachedCurrencyRate", "Session",
    "Account", "User", "VerificationToken", "Balance", "GroupBalance", "AppMetadata"
    RESTART IDENTITY CASCADE`);
  await db.$executeRaw`DELETE FROM cron.job_run_details`;
  await db.$executeRaw`DELETE FROM cron.job`;
};
