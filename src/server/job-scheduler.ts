import PgBoss, { type Job } from 'pg-boss';

import { env } from '~/env';

type JobType = 'currency-conversion' | 'recurring-expense' | 'example-job';

interface JobPayload {
  userId?: number;
  groupId?: number;
  [key: string]: unknown;
}

interface CurrencyConversionPayload extends JobPayload {
  baseCurrency: string;
  targetCurrency: string;
}

interface RecurringExpensePayload extends JobPayload {
  expenseId: number;
  groupId: number;
  amount: bigint;
  currency: string;
  name: string;
}

// Global instance to ensure singleton
let boss: PgBoss | null = null;

/**
 * Initialize the job scheduler (pg-boss)
 * This should be called during server startup
 */
export async function initializeJobScheduler(): Promise<PgBoss | null> {
  if (!env.JOB_SCHEDULER_ENABLED) {
    console.log('Job scheduler is disabled');
    return null;
  }

  if (boss) {
    return boss;
  }

  try {
    boss = new PgBoss({
      connectionString: env.DATABASE_URL,
      schema: 'pgboss', // Use a separate schema for pg-boss tables
      max: 5, // Maximum number of connections
      retryLimit: 2,
      retryDelay: 5000,
      monitorStateIntervalSeconds: 10,
    });

    // Set up job handlers
    setupJobHandlers(boss);

    await boss.start();
    console.log('Job scheduler initialized successfully');

    return boss;
  } catch (error) {
    console.error('Failed to initialize job scheduler:', error);
    return null;
  }
}

/**
 * Get the job scheduler instance
 */
export function getJobScheduler(): PgBoss | null {
  return boss;
}

/**
 * Schedule a one-time job
 */
export async function scheduleJob<T extends JobPayload>(
  jobType: JobType,
  payload: T,
  options?: {
    priority?: number;
    retryLimit?: number;
    retryDelay?: number;
    startAfter?: Date | string;
  },
): Promise<string | null> {
  if (!boss) {
    console.warn('Job scheduler not initialized');
    return null;
  }

  try {
    const jobId = await boss.send(jobType, payload, options);
    console.log(`Scheduled job ${jobType} with ID: ${jobId}`);
    return jobId;
  } catch (error) {
    console.error(`Failed to schedule job ${jobType}:`, error);
    return null;
  }
}

/**
 * Schedule a recurring job (cron-like)
 */
export async function scheduleRecurringJob<T extends JobPayload>(
  jobType: JobType,
  payload: T,
  cronExpression: string,
  options?: {
    priority?: number;
    retryLimit?: number;
    retryDelay?: number;
  },
): Promise<void> {
  if (!boss) {
    console.warn('Job scheduler not initialized');
    return;
  }

  try {
    await boss.send(
      jobType,
      payload,
      {
        ...options,
        cron: cronExpression,
      },
    );
    console.log(`Scheduled recurring job ${jobType} with cron: ${cronExpression}`);
  } catch (error) {
    console.error(`Failed to schedule recurring job ${jobType}:`, error);
  }
}

/**
 * Cancel a job by ID
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  if (!boss) {
    console.warn('Job scheduler not initialized');
    return false;
  }

  try {
    await boss.cancel(jobId);
    console.log(`Cancelled job with ID: ${jobId}`);
    return true;
  } catch (error) {
    console.error(`Failed to cancel job ${jobId}:`, error);
    return false;
  }
}

/**
 * Set up job handlers for different job types
 */
function setupJobHandlers(boss: PgBoss): void {
  // Currency conversion job handler
  boss.work('currency-conversion', async (job: Job<CurrencyConversionPayload>) => {
    console.log('Processing currency conversion job:', job.data);
    
    try {
      // TODO: Implement actual currency conversion logic
      // This could call an external API to fetch exchange rates
      const { baseCurrency, targetCurrency } = job.data;
      
      // Example: Fetch exchange rate from an API
      // const rate = await fetchExchangeRate(baseCurrency, targetCurrency);
      // await updateCurrencyRates(baseCurrency, targetCurrency, rate);
      
      console.log(`Currency conversion completed: ${baseCurrency} -> ${targetCurrency}`);
    } catch (error) {
      console.error('Currency conversion job failed:', error);
      throw error; // This will mark the job as failed and potentially retry
    }
  });

  // Recurring expense job handler
  boss.work('recurring-expense', async (job: Job<RecurringExpensePayload>) => {
    console.log('Processing recurring expense job:', job.data);
    
    try {
      // TODO: Implement actual recurring expense logic
      // This could create a new expense based on the recurring template
      const { expenseId, groupId, amount, currency, name } = job.data;
      
      // Example: Create a new expense
      // await createRecurringExpense({
      //   templateId: expenseId,
      //   groupId,
      //   amount,
      //   currency,
      //   name
      // });
      
      console.log(`Recurring expense created for group ${groupId}: ${name}`);
    } catch (error) {
      console.error('Recurring expense job failed:', error);
      throw error;
    }
  });

  // Example job handler for testing
  boss.work('example-job', async (job: Job<JobPayload>) => {
    console.log('Processing example job:', job.data);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Example job completed successfully');
  });
}

/**
 * Gracefully shutdown the job scheduler
 */
export async function shutdownJobScheduler(): Promise<void> {
  if (boss) {
    try {
      await boss.stop();
      boss = null;
      console.log('Job scheduler shutdown complete');
    } catch (error) {
      console.error('Error during job scheduler shutdown:', error);
    }
  }
}

// Export types for use in other modules
export type {
  JobType,
  JobPayload,
  CurrencyConversionPayload,
  RecurringExpensePayload,
};