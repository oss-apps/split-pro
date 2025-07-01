import { type CreateExpense } from '~/types/expense.types';
import { CronHelpers, RecurringExpenseService } from './jobService';
import { createExpense } from './splitService';

/**
 * Extended service for handling recurring and scheduled expenses
 */
export class ExpenseSchedulingService {
  /**
   * Create a recurring expense that will be automatically created on schedule
   */
  static async createRecurringExpense(
    expenseTemplate: CreateExpense,
    cronExpression: string,
    currentUserId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // First, create the initial expense
      const initialExpense = await createExpense(expenseTemplate, currentUserId);
      
      if (!initialExpense) {
        return {
          success: false,
          message: 'Failed to create initial expense',
        };
      }

      // Schedule the recurring expense using the job scheduler
      await RecurringExpenseService.scheduleRecurringExpense(
        {
          expenseId: initialExpense.id,
          groupId: expenseTemplate.groupId ?? 0,
          amount: expenseTemplate.amount,
          currency: expenseTemplate.currency,
          name: expenseTemplate.name,
        },
        cronExpression,
      );

      return {
        success: true,
        message: `Recurring expense "${expenseTemplate.name}" scheduled successfully`,
      };
    } catch (error) {
      console.error('Failed to create recurring expense:', error);
      return {
        success: false,
        message: 'Failed to schedule recurring expense',
      };
    }
  }

  /**
   * Schedule a one-time expense for the future
   */
  static async scheduleExpenseForDate(
    expenseTemplate: CreateExpense,
    scheduleDate: Date,
    currentUserId: number,
  ): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      const jobId = await RecurringExpenseService.createScheduledExpense(
        {
          expenseId: 0, // Will be generated when the job runs
          groupId: expenseTemplate.groupId ?? 0,
          amount: expenseTemplate.amount,
          currency: expenseTemplate.currency,
          name: expenseTemplate.name,
        },
        scheduleDate,
      );

      if (!jobId) {
        return {
          success: false,
          message: 'Failed to schedule expense',
        };
      }

      return {
        success: true,
        message: `Expense "${expenseTemplate.name}" scheduled for ${scheduleDate.toLocaleString()}`,
        jobId,
      };
    } catch (error) {
      console.error('Failed to schedule expense:', error);
      return {
        success: false,
        message: 'Failed to schedule expense',
      };
    }
  }

  /**
   * Common recurring patterns for expenses
   */
  static getCommonSchedules() {
    return {
      monthly: {
        firstOfMonth9AM: CronHelpers.monthly(1, 9),
        fifteenthOfMonth9AM: CronHelpers.monthly(15, 9),
        lastDayOfMonth: '0 9 28-31 * *', // Last few days of month
      },
      weekly: {
        mondayMorning: CronHelpers.weekly(1, 9),
        fridayEvening: CronHelpers.weekly(5, 17),
        sundayNight: CronHelpers.weekly(0, 23),
      },
      daily: {
        morning: CronHelpers.daily(9),
        evening: CronHelpers.daily(18),
        midnight: CronHelpers.daily(0),
      },
    };
  }

  /**
   * Get human-readable description of cron expressions
   */
  static describeCronExpression(cronExpression: string): string {
    const commonExpressions: Record<string, string> = {
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 0 * * 0': 'Weekly on Sunday at midnight',
      '0 9 * * 1': 'Weekly on Monday at 9:00 AM',
      '0 9 1 * *': 'Monthly on the 1st at 9:00 AM',
      '0 9 15 * *': 'Monthly on the 15th at 9:00 AM',
      '0 * * * *': 'Every hour',
      '*/15 * * * *': 'Every 15 minutes',
    };

    return commonExpressions[cronExpression] || 'Custom schedule';
  }
}

/**
 * Example usage patterns
 */
export const ExpenseSchedulingExamples = {
  /**
   * Monthly rent expense
   */
  monthlyRent: {
    expenseTemplate: {
      name: 'Monthly Rent',
      category: 'Housing',
      amount: 150000n, // $1500.00
      currency: 'USD',
      splitType: 'EQUAL' as const,
      participants: [],
      paidBy: 0, // Will be set when used
      groupId: 0, // Will be set when used
    },
    schedule: CronHelpers.monthly(1, 9), // 1st of every month at 9 AM
  },

  /**
   * Weekly groceries
   */
  weeklyGroceries: {
    expenseTemplate: {
      name: 'Weekly Groceries',
      category: 'Food',
      amount: 8000n, // $80.00
      currency: 'USD',
      splitType: 'EQUAL' as const,
      participants: [],
      paidBy: 0,
      groupId: 0,
    },
    schedule: CronHelpers.weekly(1, 19), // Every Monday at 7 PM
  },

  /**
   * Utility bills (monthly)
   */
  monthlyUtilities: {
    expenseTemplate: {
      name: 'Electricity Bill',
      category: 'Utilities',
      amount: 12000n, // $120.00
      currency: 'USD',
      splitType: 'EQUAL' as const,
      participants: [],
      paidBy: 0,
      groupId: 0,
    },
    schedule: CronHelpers.monthly(15, 10), // 15th of every month at 10 AM
  },
};