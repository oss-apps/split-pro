/**
 * Add things here to be executed during server startup.
 *
 * more details here: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Registering instrumentation');
    const { validateAuthEnv } = await import('./server/auth');
    validateAuthEnv();

    const { checkRecurrenceNotifications } = await import(
      './server/api/services/notificationService'
    );
    console.log('Starting recurrent expense notification checking...');
    setTimeout(checkRecurrenceNotifications, 1000 * 10); // Start after 10 seconds
  }

  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    console.log('Skipping instrumentation on edge runtime');
    return;
  }

  if (process.env.DATABASE_URL) {
    const { db } = await import('./server/db');
    await db.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_cron;`;
  }

  // Create cron jobs
  if (process.env.CLEAR_BANK_CACHE_FREQUENCY && process.env.DATABASE_URL) {
    const frequencies = ['weekly', 'monthly'];

    if (frequencies.includes(process.env.CLEAR_BANK_CACHE_FREQUENCY)) {
      console.log('Setting up cron jobs...');

      const { createRecurringDeleteBankCacheJob } = await import(
        './server/api/services/scheduleService'
      );
      console.log(
        `Creating cron job for cleaning up bank cache ${process.env.CLEAR_BANK_CACHE_FREQUENCY}`,
      );
      setTimeout(
        () =>
          createRecurringDeleteBankCacheJob(
            process.env.CLEAR_BANK_CACHE_FREQUENCY as 'weekly' | 'monthly',
          ),
        1000 * 10,
      );
    }
  }
}
