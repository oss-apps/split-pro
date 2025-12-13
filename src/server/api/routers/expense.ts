import { randomUUID } from 'crypto';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { getDocumentUploadUrl } from '~/server/storage';
import { BigMath, currencyConversion } from '~/utils/numbers';

import {
  arrayify,
  createCurrencyConversionSchema,
  createExpenseSchema,
  getBatchCurrencyRatesSchema,
  getCurrencyRateSchema,
} from '~/types/expense.types';
import { createExpense, deleteExpense, editExpense } from '../services/splitService';
import { currencyRateProvider } from '../services/currencyRateService';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { SplitType } from '@prisma/client';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { createRecurringExpenseJob } from '../services/scheduleService';
import { getUserMap } from './user';

export const expenseRouter = createTRPCRouter({
  getBalances: protectedProcedure.query(async ({ ctx }) => {
    const [balancesRaw, cumulatedBalances] = await Promise.all([
      db.balanceView.groupBy({
        by: ['friendId', 'currency'],
        _sum: { amount: true },
        where: {
          userId: ctx.session.user.id,
          friendId: { notIn: ctx.session.user.hiddenFriendIds },
        },
      }),
      db.balanceView.groupBy({
        by: ['currency'],
        _sum: { amount: true },
        where: { userId: ctx.session.user.id, amount: { not: 0 } },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const userMap = await getUserMap(balancesRaw.map((b) => b.friendId));

    // Group balances by friendId to return all currencies per friend
    const balancesByFriend = balancesRaw.reduce<
      Record<number, { currency: string; amount: bigint }[]>
    >((acc, b) => {
      const amount = b._sum.amount ?? 0n;
      if (!acc[b.friendId]) {
        acc[b.friendId] = [];
      }
      acc[b.friendId]!.push({ currency: b.currency, amount });
      return acc;
    }, {});

    const balances = Object.entries(balancesByFriend)
      .map(([friendId, currencies]) => ({
        friendId: Number(friendId),
        currencies,
        friend: userMap[Number(friendId)]!,
        // For sorting, use the largest absolute value across all currencies
        maxAmount: currencies.reduce(
          (max, curr) => (BigMath.abs(curr.amount) > BigMath.abs(max) ? curr.amount : max),
          0n,
        ),
      }))
      .sort((a, b) => Number(BigMath.abs(b.maxAmount) - BigMath.abs(a.maxAmount)));

    const youOwe: { currency: string; amount: bigint }[] = [];
    const youGet: { currency: string; amount: bigint }[] = [];

    for (const b of cumulatedBalances) {
      const sumAmount = b._sum.amount;
      if (sumAmount && 0 < sumAmount) {
        youGet.push({ currency: b.currency, amount: sumAmount ?? 0 });
      } else if (sumAmount && 0 > sumAmount) {
        youOwe.push({ currency: b.currency, amount: sumAmount ?? 0 });
      }
    }

    youOwe.reverse();

    return {
      balances,
      cumulatedBalances,
      youOwe,
      youGet,
    };
  }),

  addOrEditExpense: protectedProcedure
    .input(arrayify(createExpenseSchema))
    .mutation(async ({ input: expenses, ctx }) => {
      const results = [];
      for (const input of expenses) {
        if (input.expenseId) {
          await validateEditExpensePermission(input.expenseId, ctx.session.user.id);
        }
        if (input.splitType === SplitType.CURRENCY_CONVERSION) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid split type' });
        }

        if (input.groupId !== null) {
          const group = await db.group.findUnique({
            where: { id: input.groupId },
            select: { archivedAt: true },
          });
          if (!group) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group not found' });
          }
          if (group.archivedAt) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group is archived' });
          }
        }

        try {
          const expense = input.expenseId
            ? await editExpense(input, ctx.session.user.id)
            : await createExpense(input, ctx.session.user.id);

          if (expense && input.cronExpression) {
            const [{ schedule }] = await createRecurringExpenseJob(
              expense.id,
              input.cronExpression,
            );
            console.log('Created recurring expense job with jobid:', schedule);

            await db.expense.update({
              where: { id: expense.id },
              data: {
                recurrence: {
                  upsert: {
                    create: {
                      job: {
                        connect: { jobid: schedule },
                      },
                    },
                    update: {
                      job: {
                        connect: { jobid: schedule },
                      },
                    },
                  },
                },
              },
            });
          }

          results.push(expense);
        } catch (error) {
          console.error(error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create expense',
          });
        }
      }

      return results;
    }),

  addOrEditCurrencyConversion: protectedProcedure
    .input(createCurrencyConversionSchema)
    .mutation(async ({ input, ctx }) => {
      const { amount, rate, from, to, senderId, receiverId, groupId, expenseId } = input;

      if (!isCurrencyCode(from) || !isCurrencyCode(to)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid currency code' });
      }

      const amountTo = currencyConversion({ from, to, amount, rate });
      const name = `${from} → ${to} @ ${rate}`;

      const conversionFrom = {
        expenseId,
        name,
        currency: from,
        amount,
        paidBy: senderId,
        splitType: SplitType.CURRENCY_CONVERSION,
        category: DEFAULT_CATEGORY,
        participants: [
          { userId: senderId, amount: amount },
          { userId: receiverId, amount: -amount },
        ],
        groupId,
        expenseDate: new Date(),
      };

      const conversionTo = {
        ...conversionFrom,
        expenseId: undefined,
        currency: to,
        amount: amountTo,
        paidBy: receiverId,
        participants: [
          { userId: senderId, amount: -amountTo },
          { userId: receiverId, amount: amountTo },
        ],
      };

      let res = null;

      if (!expenseId) {
        res = await createExpense(conversionTo, ctx.session.user.id, conversionFrom);
      } else {
        res = await editExpense(conversionFrom, ctx.session.user.id, conversionTo);
      }

      if (!res) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upsert currency conversion record',
        });
      }
    }),

  getExpensesWithFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const expenses = await db.expense.findMany({
        where: {
          AND: [
            {
              expenseParticipants: {
                some: {
                  userId: input.friendId,
                  amount: {
                    not: 0n,
                  },
                },
              },
            },
            {
              expenseParticipants: {
                some: {
                  userId: ctx.session.user.id,
                  amount: {
                    not: 0n,
                  },
                },
              },
            },
            {
              OR: [
                {
                  paidBy: ctx.session.user.id,
                },
                {
                  paidBy: input.friendId,
                },
              ],
            },
            {
              deletedBy: null,
            },
            {
              OR: [
                {
                  NOT: {
                    splitType: SplitType.CURRENCY_CONVERSION,
                  },
                },
                {
                  NOT: {
                    conversionToId: null,
                  },
                },
              ],
            },
          ],
        },
        orderBy: {
          expenseDate: 'desc',
        },
        include: {
          expenseParticipants: {
            where: {
              OR: [
                {
                  userId: ctx.session.user.id,
                },
                {
                  userId: input.friendId,
                },
              ],
            },
          },
          paidByUser: true,
          conversionTo: true,
        },
      });

      return expenses;
    }),

  getGroupExpenses: groupProcedure
    .input(z.object({ groupId: z.number() }))
    .query(async ({ input, ctx }) => {
      const expenses = await ctx.db.expense.findMany({
        where: {
          groupId: input.groupId,
          deletedBy: null,
          OR: [
            {
              NOT: {
                splitType: SplitType.CURRENCY_CONVERSION,
              },
            },
            {
              NOT: {
                conversionToId: null,
              },
            },
          ],
        },
        orderBy: {
          expenseDate: 'desc',
        },
        include: {
          expenseParticipants: true,
          paidByUser: true,
          deletedByUser: true,
          conversionTo: true,
        },
      });

      return expenses;
    }),

  getExpenseDetails: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ input }) => {
      const expense = await db.expense.findUnique({
        where: {
          id: input.expenseId,
        },
        include: {
          expenseParticipants: {
            include: {
              user: true,
            },
          },
          expenseNotes: true,
          addedByUser: true,
          paidByUser: true,
          deletedByUser: true,
          updatedByUser: true,
          group: true,
          recurrence: {
            include: {
              job: {
                select: {
                  schedule: true,
                },
              },
            },
          },
          conversionTo: {
            include: {
              expenseParticipants: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (expense && expense.groupId !== null) {
        const missingGroupMembers = await db.group.findUnique({
          where: {
            id: expense.groupId,
          },
          include: {
            groupUsers: {
              include: {
                user: true,
              },
              where: {
                userId: {
                  notIn: expense.expenseParticipants.map((ep) => ep.userId),
                },
              },
            },
          },
        });
        missingGroupMembers?.groupUsers.forEach((gu) => {
          expense.expenseParticipants.push({
            userId: gu.user.id,
            expenseId: expense.id,
            user: gu.user,
            amount: 0n,
          });
        });
      }

      if (expense?.recurrence?.job.schedule) {
        expense.recurrence.job.schedule = expense.recurrence.job.schedule.replaceAll('$', 'L');
      }

      return expense;
    }),

  getAllExpenses: protectedProcedure.query(async ({ ctx }) => {
    const expenses = await db.expenseParticipant.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        expense: {
          createdAt: 'desc',
        },
      },
      include: {
        expense: {
          include: {
            paidByUser: {
              select: {
                name: true,
                email: true,
                image: true,
                id: true,
              },
            },
            deletedByUser: {
              select: {
                name: true,
                email: true,
                image: true,
                id: true,
              },
            },
          },
        },
      },
    });

    return expenses;
  }),

  getRecurringExpenses: protectedProcedure.query(async ({ ctx }) => {
    const recurrences = await db.expenseRecurrence.findMany({
      include: {
        job: true,
        expense: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          where: {
            deletedBy: null,
            expenseParticipants: {
              some: {
                userId: ctx.session.user.id,
              },
            },
            recurrenceId: { not: null },
          },
          include: {
            addedByUser: {
              select: {
                name: true,
                email: true,
                image: true,
                id: true,
              },
            },
          },
        },
      },
    });

    return recurrences
      .filter((r) => r.expense.length > 0)
      .map((r) => ({ ...r, expense: r.expense[0]! }));
  }),

  getUploadUrl: protectedProcedure
    .input(z.object({ fileName: z.string(), fileType: z.string(), fileSize: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const randomId = randomUUID();
      const extension = input.fileName.split('.').pop();
      const key = `${ctx.session.user.id}/${randomId}.${extension}`;

      if (input.fileSize > FILE_SIZE_LIMIT) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File size limit exceeded' });
      }

      try {
        const fileUrl = await getDocumentUploadUrl(key, input.fileType, input.fileSize);
        return { fileUrl, key };
      } catch (e) {
        console.error('Error getting upload url:', e);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error getting upload url' });
      }
    }),

  deleteExpense: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await validateEditExpensePermission(input.expenseId, ctx.session.user.id);

      const expense = await db.expense.findUnique({
        where: { id: input.expenseId },
        select: { groupId: true },
      });

      if (!expense) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Expense not found' });
      }

      if (expense.groupId !== null) {
        const group = await db.group.findUnique({
          where: { id: expense.groupId },
          select: { archivedAt: true },
        });
        if (!group) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group not found' });
        }
        if (group.archivedAt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group is archived' });
        }
      }

      await deleteExpense(input.expenseId, ctx.session.user.id);
    }),

  getCurrencyRate: protectedProcedure.input(getCurrencyRateSchema).query(async ({ input }) => {
    const { from, to, date } = input;

    if (!isCurrencyCode(from) || !isCurrencyCode(to)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid currency code' });
    }

    const rate = await currencyRateProvider.getCurrencyRate(from, to, date);

    return { rate };
  }),

  getBatchCurrencyRates: protectedProcedure
    .input(getBatchCurrencyRatesSchema)
    .query(async ({ input }) => {
      const { from, to, date } = input;

      if (from.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing from currency code' });
      }

      if (!from.every(isCurrencyCode) || !isCurrencyCode(to)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid currency code' });
      }

      const rates = new Map<string, number>();

      // Get the first rate to precache rates for the target currency
      const rate = await currencyRateProvider.getCurrencyRate(from[0] as CurrencyCode, to, date);
      rates.set(from[0]!, rate);

      if (from.length > 1) {
        // Fetch rates for remaining currencies and return as map
        await Promise.all(
          from.slice(1).map(async (currency) => {
            const r = await currencyRateProvider.getCurrencyRate(
              currency as CurrencyCode,
              to,
              date,
            );
            rates.set(currency, r);
          }),
        );
      }

      return { rates };
    }),
});

const validateEditExpensePermission = async (expenseId: string, userId: number): Promise<void> => {
  const [expenseParticipant, addedBy] = await Promise.all([
    db.expenseParticipant.findUnique({
      where: {
        expenseId_userId: {
          expenseId: expenseId,
          userId: userId,
        },
      },
    }),
    db.expense.findUnique({ where: { id: expenseId }, select: { addedBy: true } }),
  ]);

  if (!expenseParticipant && !addedBy?.addedBy) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not the participant of the expense',
    });
  }
};

export type ExpenseRouter = typeof expenseRouter;
