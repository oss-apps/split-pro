import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db';

const TEST_DATABASE_PATTERN = /_test(?:[/?]|$)/i;

export const assertTestDatabase = (url = process.env.DATABASE_URL) => {
  if (!url) {
    throw new Error('Integration tests require DATABASE_URL');
  }

  const parsed = new URL(url);
  if (!['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
    throw new Error(`Refusing integration tests against non-local database: ${parsed.hostname}`);
  }
  if (!TEST_DATABASE_PATTERN.test(parsed.pathname)) {
    throw new Error(
      `Refusing integration tests against database without _test suffix: ${parsed.pathname}`,
    );
  }
};

assertTestDatabase();

export const resetDatabase = async () => {
  assertTestDatabase();
  await db.$transaction([
    db.expenseParticipant.deleteMany(),
    db.expenseNote.deleteMany(),
    db.expense.deleteMany(),
    db.expenseRecurrence.deleteMany(),
    db.groupDefaultSplit.deleteMany(),
    db.groupUser.deleteMany(),
    db.group.deleteMany(),
    db.friendDefaultSplit.deleteMany(),
    db.pushNotification.deleteMany(),
    db.cachedBankData.deleteMany(),
    db.cachedCurrencyRate.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.user.deleteMany(),
  ]);
  await db.$executeRawUnsafe('DELETE FROM cron.job_run_details');
  await db.$executeRawUnsafe('DELETE FROM cron.job');
};

export const closeDatabase = async () => db.$disconnect();

export const createTestClient = () => new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
