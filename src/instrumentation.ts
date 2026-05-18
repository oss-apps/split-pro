import { env } from './env';

/**
 * Add things here to be executed during server startup.
 *
 * more details here: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Registering instrumentation');

    // Run data migrations
    const { runMigrations } = await import('./migrations');
    await runMigrations();

    const { validateAuthEnv } = await import('./server/auth');
    validateAuthEnv();

    const { checkRecurrenceNotifications } =
      await import('./server/api/services/notificationService');
    console.log('Starting recurrent expense notification checking...');
    setTimeout(checkRecurrenceNotifications, 1000 * 10); // Start after 10 seconds
  }

  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    console.log('Skipping instrumentation on edge runtime');
    return;
  }

  if (env.CLEAR_CACHE_CRON_RULE && env.CACHE_RETENTION_INTERVAL) {
    // Create cron jobs
    console.log('Setting up cron jobs...');

    const { createRecurringDeleteBankCacheJob } =
      await import('./server/api/services/scheduleService');

    console.log(
      `Creating cron job for cleaning up bank cache ${env.CLEAR_CACHE_CRON_RULE} with interval ${env.CACHE_RETENTION_INTERVAL}`,
    );
    setTimeout(
      () =>
        createRecurringDeleteBankCacheJob(
          env.CLEAR_CACHE_CRON_RULE!,
          env.CACHE_RETENTION_INTERVAL!,
        ).catch((err) => {
          console.error('Error creating recurring delete bank cache job:', err);
        }),
      1000 * 10,
    );
  }
}
