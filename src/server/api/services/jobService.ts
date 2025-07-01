import {
  type CurrencyConversionPayload,
  type RecurringExpensePayload,
  scheduleJob,
  scheduleRecurringJob,
} from '../../job-scheduler';

/**
 * Service for scheduling currency conversion jobs
 */
export class CurrencyConversionService {
  /**
   * Schedule a one-time currency conversion update
   */
  static async updateCurrencyRates(
    baseCurrency: string,
    targetCurrency: string,
    options?: {
      priority?: number;
      startAfter?: Date;
    },
  ): Promise<string | null> {
    const payload: CurrencyConversionPayload = {
      baseCurrency,
      targetCurrency,
    };

    return scheduleJob('currency-conversion', payload, options);
  }

  /**
   * Schedule recurring currency conversion updates
   * Default: every day at 2 AM UTC
   */
  static async scheduleRecurringCurrencyUpdates(
    baseCurrency: string,
    targetCurrency: string,
    cronExpression: string = '0 2 * * *',
  ): Promise<void> {
    const payload: CurrencyConversionPayload = {
      baseCurrency,
      targetCurrency,
    };

    return scheduleRecurringJob('currency-conversion', payload, cronExpression);
  }
}

/**
 * Service for scheduling recurring expense jobs
 */
export class RecurringExpenseService {
  /**
   * Schedule a recurring expense
   */
  static async scheduleRecurringExpense(
    expenseData: {
      expenseId: number;
      groupId: number;
      amount: bigint;
      currency: string;
      name: string;
    },
    cronExpression: string,
    options?: {
      priority?: number;
      retryLimit?: number;
    },
  ): Promise<void> {
    const payload: RecurringExpensePayload = {
      expenseId: expenseData.expenseId,
      groupId: expenseData.groupId,
      amount: expenseData.amount,
      currency: expenseData.currency,
      name: expenseData.name,
    };

    return scheduleRecurringJob('recurring-expense', payload, cronExpression, options);
  }

  /**
   * Schedule a one-time expense creation
   */
  static async createScheduledExpense(
    expenseData: {
      expenseId: number;
      groupId: number;
      amount: bigint;
      currency: string;
      name: string;
    },
    scheduleFor: Date,
    options?: {
      priority?: number;
      retryLimit?: number;
    },
  ): Promise<string | null> {
    const payload: RecurringExpensePayload = {
      expenseId: expenseData.expenseId,
      groupId: expenseData.groupId,
      amount: expenseData.amount,
      currency: expenseData.currency,
      name: expenseData.name,
    };

    return scheduleJob('recurring-expense', payload, {
      ...options,
      startAfter: scheduleFor,
    });
  }
}

/**
 * Utility functions for common cron expressions
 */
export class CronHelpers {
  static readonly HOURLY = '0 * * * *';
  static readonly DAILY = '0 0 * * *';
  static readonly WEEKLY = '0 0 * * 0';
  static readonly MONTHLY = '0 0 1 * *';
  static readonly YEARLY = '0 0 1 1 *';

  /**
   * Generate a daily cron expression at a specific hour and minute
   */
  static daily(hour: number, minute: number = 0): string {
    return `${minute} ${hour} * * *`;
  }

  /**
   * Generate a weekly cron expression on a specific day and time
   */
  static weekly(dayOfWeek: number, hour: number, minute: number = 0): string {
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  /**
   * Generate a monthly cron expression on a specific day and time
   */
  static monthly(dayOfMonth: number, hour: number, minute: number = 0): string {
    return `${minute} ${hour} ${dayOfMonth} * *`;
  }
}