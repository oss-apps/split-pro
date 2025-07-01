import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { CronHelpers, CurrencyConversionService, RecurringExpenseService } from '../services/jobService';
import { ExpenseSchedulingService } from '../services/expenseSchedulingService';
import { scheduleJob } from '~/server/job-scheduler';

export const jobRouter = createTRPCRouter({
  /**
   * Schedule a currency conversion update
   */
  scheduleCurrencyUpdate: protectedProcedure
    .input(
      z.object({
        baseCurrency: z.string().min(3).max(3),
        targetCurrency: z.string().min(3).max(3),
        startAfter: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const jobId = await CurrencyConversionService.updateCurrencyRates(
        input.baseCurrency,
        input.targetCurrency,
        {
          startAfter: input.startAfter,
        },
      );

      return {
        success: !!jobId,
        jobId,
        message: jobId 
          ? `Currency conversion job scheduled with ID: ${jobId}`
          : 'Failed to schedule currency conversion job',
      };
    }),

  /**
   * Schedule recurring currency updates
   */
  scheduleRecurringCurrencyUpdates: protectedProcedure
    .input(
      z.object({
        baseCurrency: z.string().min(3).max(3),
        targetCurrency: z.string().min(3).max(3),
        cronExpression: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await CurrencyConversionService.scheduleRecurringCurrencyUpdates(
          input.baseCurrency,
          input.targetCurrency,
          input.cronExpression,
        );

        return {
          success: true,
          message: 'Recurring currency update scheduled successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to schedule recurring currency updates',
        };
      }
    }),

  /**
   * Schedule a recurring expense
   */
  scheduleRecurringExpense: protectedProcedure
    .input(
      z.object({
        expenseId: z.number(),
        groupId: z.number(),
        amount: z.bigint(),
        currency: z.string().min(3).max(3),
        name: z.string().min(1),
        cronExpression: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await RecurringExpenseService.scheduleRecurringExpense(
          {
            expenseId: input.expenseId,
            groupId: input.groupId,
            amount: input.amount,
            currency: input.currency,
            name: input.name,
          },
          input.cronExpression,
        );

        return {
          success: true,
          message: 'Recurring expense scheduled successfully',
        };
      } catch (error) {
        return {
          success: false,
          message: 'Failed to schedule recurring expense',
        };
      }
    }),

  /**
   * Schedule a one-time expense for a future date
   */
  scheduleExpense: protectedProcedure
    .input(
      z.object({
        expenseId: z.number(),
        groupId: z.number(),
        amount: z.bigint(),
        currency: z.string().min(3).max(3),
        name: z.string().min(1),
        scheduleFor: z.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const jobId = await RecurringExpenseService.createScheduledExpense(
        {
          expenseId: input.expenseId,
          groupId: input.groupId,
          amount: input.amount,
          currency: input.currency,
          name: input.name,
        },
        input.scheduleFor,
      );

      return {
        success: !!jobId,
        jobId,
        message: jobId 
          ? `Expense scheduled with ID: ${jobId}`
          : 'Failed to schedule expense',
      };
    }),

  /**
   * Schedule a test job (for development/testing purposes)
   */
  scheduleTestJob: protectedProcedure
    .input(
      z.object({
        message: z.string().optional().default('Hello from test job!'),
        delayMinutes: z.number().min(0).max(60).optional().default(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const startAfter = new Date(Date.now() + input.delayMinutes * 60 * 1000);
      
      const jobId = await scheduleJob(
        'example-job',
        {
          message: input.message,
          userId: ctx.session.user.id,
          scheduledBy: ctx.session.user.name || 'Unknown',
        },
        {
          startAfter,
        },
      );

      return {
        success: !!jobId,
        jobId,
        message: jobId 
          ? `Test job scheduled with ID: ${jobId} to run in ${input.delayMinutes} minutes`
          : 'Failed to schedule test job',
      };
    }),

  /**
   * Get available cron helper expressions
   */
  getCronHelpers: protectedProcedure
    .query(() => {
      return {
        predefined: {
          hourly: CronHelpers.HOURLY,
          daily: CronHelpers.DAILY,
          weekly: CronHelpers.WEEKLY,
          monthly: CronHelpers.MONTHLY,
          yearly: CronHelpers.YEARLY,
        },
        examples: {
          dailyAt9AM: CronHelpers.daily(9),
          weeklyMondayAt8AM: CronHelpers.weekly(1, 8),
          monthlyFirst9AM: CronHelpers.monthly(1, 9),
          everyWeekdayAt9AM: '0 9 * * 1-5',
          everyTwoHours: '0 */2 * * *',
        },
        description: {
          format: 'minute hour day month dayOfWeek',
          ranges: {
            minute: '0-59',
            hour: '0-23',
            day: '1-31',
            month: '1-12',
            dayOfWeek: '0-7 (0 and 7 = Sunday)',
          },
        },
      };
    }),

  /**
   * Get common recurring expense schedules
   */
  getCommonSchedules: protectedProcedure
    .query(() => {
      const schedules = ExpenseSchedulingService.getCommonSchedules();
      
      // Add human-readable descriptions
      const describedSchedules = Object.entries(schedules).reduce((acc, [category, patterns]) => {
        acc[category] = Object.entries(patterns).reduce((catAcc, [name, cron]) => {
          catAcc[name] = {
            cron,
            description: ExpenseSchedulingService.describeCronExpression(cron),
          };
          return catAcc;
        }, {} as Record<string, { cron: string; description: string }>);
        return acc;
      }, {} as Record<string, Record<string, { cron: string; description: string }>>);

      return describedSchedules;
    }),

  /**
   * Describe a cron expression in human-readable format
   */
  describeCron: protectedProcedure
    .input(z.object({
      cronExpression: z.string(),
    }))
    .query(({ input }) => {
      return {
        expression: input.cronExpression,
        description: ExpenseSchedulingService.describeCronExpression(input.cronExpression),
      };
    }),
});