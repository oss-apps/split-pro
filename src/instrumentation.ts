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
    // The retry module has no imports, so loading it cannot fail the way the migrations module can.
    // Keeping it outside the try guarantees the catch can always terminate the process.
    const { terminateAfterMigrationFailure, waitForDatabase } = await import('./migrations/retry');
    try {
      // Import inside the try so database client or env failures at import time also terminate.
      const { checkDatabaseConnection, runMigrations } = await import('./migrations');
      // Retry only a side-effect-free readiness query. Migrations can modify the database and files.
      // Repeating a partially completed migration could repeat those side effects.
      await waitForDatabase(checkDatabaseConnection);
      await runMigrations();
    } catch (error) {
      await terminateAfterMigrationFailure(error);
    }

    if (!env.TEST_MODE) {
      const { reconcileRecurrenceSchedules } =
        await import('./server/api/services/recurrenceScheduleService');
      const updatedSchedules = await reconcileRecurrenceSchedules();
      console.info(`Updated ${updatedSchedules} recurrence schedules to ${env.RECURRENCE_TIME}`);
    }

    const { validateAuthEnv } = await import('./server/auth');
    validateAuthEnv();

    const { checkRecurrenceNotifications } =
      await import('./server/api/services/notificationService');
    if (!env.TEST_MODE) {
      console.log('Starting recurrent expense notification checking...');
      setTimeout(checkRecurrenceNotifications, 1000 * 10); // Start after 10 seconds
    }
  }

  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    console.log('Skipping instrumentation on edge runtime');
    return;
  }

  if (!env.TEST_MODE && env.CLEAR_CACHE_CRON_RULE && env.CACHE_RETENTION_INTERVAL) {
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
