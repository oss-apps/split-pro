import { RecurrenceInterval } from '@prisma/client';
import { getDate, getMonth } from 'date-fns';
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
  date: Date,
  repeatEvery: number,
  repeatInterval: RecurrenceInterval,
) => {
  // Implementation for creating a recurring expense job using pg_cron
  const cronExpression = getCronExpression(date, repeatEvery, repeatInterval);

  // oxlint-disable-next-line no-unused-vars
  const procedure = '';

  await db.$executeRaw`
SELECT cron.schedule(
  ${expenseId}, 
  ${cronExpression}, 
  $$ SELECT duplicate_expense_with_participants(${expenseId}::UUID); $$
);`;
};

const getCronExpression = (date: Date, repeatEvery: number, repeatInterval: RecurrenceInterval) => {
  switch (repeatInterval) {
    case RecurrenceInterval.DAILY:
    case RecurrenceInterval.WEEKLY: {
      const mult = repeatInterval === RecurrenceInterval.WEEKLY ? 7 : 1;
      return `0 0 ${getDate(date)}/${mult * repeatEvery} * *`;
    }
    case RecurrenceInterval.MONTHLY:
    case RecurrenceInterval.YEARLY: {
      const dayOfMonth = getDate(date);
      const mult = repeatInterval === RecurrenceInterval.YEARLY ? 12 : 1;
      return `0 0 ${dayOfMonth > 28 ? 'L' : dayOfMonth} ${getMonth(date) + 1}/${mult * repeatEvery} *`;
    }
    default:
      throw new Error('Invalid recurrence interval');
  }
};
