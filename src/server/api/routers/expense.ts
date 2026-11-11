import { cronToBackend } from '~/lib/cron';
import {
  getNextRecurrenceDate,
  getRecurrenceSchedule,
} from '../services/recurrenceScheduleService';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { beforeCursor, paginationInput, toPage } from '~/utils/pagination';

import { getUserBalances } from '~/server/api/services/balanceQuery';
import {
  balanceProcedure,
  createTRPCRouter,
  groupProcedure,
  protectedProcedure,
} from '~/server/api/trpc';
import { paginationInput as apiPaginationInput, paginatedResult } from '~/server/api/pagination';
import { db } from '~/server/db';
import {
  type CreateExpense,
  arrayify,
  createCurrencyConversionSchema,
  createExpenseSchema,
  getBatchCurrencyRatesSchema,
  getCurrencyRateSchema,
} from '~/types/expense.types';
import { BigMath, currencyConversion } from '~/utils/numbers';
import {
  assertExpenseGroupReassignment,
  createExpense,
  deleteExpense,
  editExpense,
} from '../services/splitService';
import { currencyRateProvider } from '../services/currencyRateService';
import { commentProcedures } from '../services/commentService';
import { isCurrencyCode } from '~/lib/currency';
import { SplitType } from '@prisma/client';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { getUserMap } from './user';

/**
 * Shared write path for creating/editing expenses, used by both the app
 * router's `addOrEditExpense` and the public API variant. Re-run permission
 * checks per expense and stop on the first failure.
 */
const upsertExpenses = async (expenses: CreateExpense[], userId: number) => {
  const results = [];
  // Expense writes must preserve input order and stop on the first validation/write failure.
  // oxlint-disable no-await-in-loop
  for (const input of expenses) {
    const storedGroupId = await validateExpenseWritePermission(
      input.expenseId,
      input.groupId,
      userId,
    );
    if (input.splitType === SplitType.CURRENCY_CONVERSION) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid split type' });
    }

    if (input.expenseId) {
      await assertExpenseGroupReassignment(
        storedGroupId,
        input.groupId,
        input.paidBy,
        input.participants.map((participant) => participant.userId),
      );
    }

    try {
      const expense = input.expenseId
        ? await editExpense(input, userId)
        : await createExpense(input, userId);

      results.push(expense);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error(error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create expense',
      });
    }
  }
  // oxlint-enable no-await-in-loop

  return results;
};

/** Where-clause shared by the app and paginated API group expense listings. */
const groupExpensesWhere = (groupId: number) => ({
  groupId,
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
});

/** Where-clause shared by the app and paginated API friend expense listings. */
const expensesWithFriendWhere = (userId: number, friendId: number) => ({
  AND: [
    {
      expenseParticipants: {
        some: {
          userId: friendId,
          amount: { not: 0n },
        },
      },
    },
    {
      expenseParticipants: {
        some: {
          userId,
          amount: { not: 0n },
        },
      },
    },
    {
      OR: [{ paidBy: userId }, { paidBy: friendId }],
    },
    { deletedBy: null },
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
});

/**
 * Method record for `expenseRouter`, exported so the public API router
 * (`~/server/api/apiRouter`) can mount a curated subset of the same procedures
 * without duplicating them.
 */
export const expenseMethods = {
  ...commentProcedures,
  getRecurrencePreview: protectedProcedure
    .input(z.object({ cronExpression: z.string().transform(cronToBackend) }))
    .query(async ({ input }) => {
      const [setting] = await db.$queryRaw<{ timeZone: string }[]>`
        SELECT current_setting('cron.timezone') AS "timeZone"
      `;
      const timeZone = setting!.timeZone;
      const schedule = getRecurrenceSchedule(input.cronExpression);
      return { timeZone, schedule, nextRun: getNextRecurrenceDate(schedule, timeZone) };
    }),
  getCumulatedBalances: balanceProcedure.query(async ({ ctx }) => {
    const cumulatedBalances = await ctx.db.balanceView.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      where: { userId: ctx.session.user.id, amount: { not: 0 } },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // oxlint-disable no-underscore-dangle -- Prisma's generated aggregate API uses the `_sum` field name.
    const youOwe = cumulatedBalances
      .filter((b) => b._sum.amount && 0 > b._sum.amount)
      .map((b) => ({ currency: b.currency, amount: b._sum.amount! }))
      .reverse();
    // oxlint-enable no-underscore-dangle

    // oxlint-disable no-underscore-dangle -- Prisma's generated aggregate API uses the `_sum` field name.
    const youGet = cumulatedBalances
      .filter((b) => b._sum.amount && 0 < b._sum.amount)
      .map((b) => ({ currency: b.currency, amount: b._sum.amount! }));
    // oxlint-enable no-underscore-dangle

    return { youOwe, youGet };
  }),

  getBalances: balanceProcedure.query(async ({ ctx }) => {
    const processedBalances = (await getUserBalances(ctx.db, ctx.session.user.id)).filter(
      (balance) => !ctx.session.user.hiddenFriendIds.includes(balance.friendId),
    );

    // Group by friendId and fetch user details
    const friendIds = [...new Set([...processedBalances].map((b) => b.friendId))];
    const userMap = await getUserMap(friendIds, ctx.db);

    // Aggregate by (friendId, currency) since same pair can appear in multiple groups
    const aggregated = processedBalances
      .filter((b) => 0n !== b.amount)
      .reduce<Map<string, { friendId: number; currency: string; amount: bigint }>>(
        (acc, { friendId, currency, amount }) => {
          const key = `${friendId}-${currency}`;
          const existing = acc.get(key);
          if (existing) {
            existing.amount += amount;
          } else {
            acc.set(key, { friendId, currency, amount });
          }
          return acc;
        },
        new Map(),
      );

    const balancesByFriend = [...aggregated.values()].reduce<
      Record<number, { currency: string; amount: bigint }[]>
    >((acc, { friendId, currency, amount }) => {
      if (!acc[friendId]) {
        acc[friendId] = [];
      }
      acc[friendId].push({ currency, amount });
      return acc;
    }, {});

    friendIds.forEach((friendId) => {
      if (!balancesByFriend[friendId]) {
        balancesByFriend[friendId] = [];
      }
    });

    const balances = Object.entries(balancesByFriend)
      .map(([friendId, currencies]) => ({
        friendId: Number(friendId),
        currencies,
        friend: userMap[Number(friendId)]!,
        maxAmount: currencies.reduce(
          (max, curr) => (BigMath.abs(curr.amount) > BigMath.abs(max) ? curr.amount : max),
          0n,
        ),
      }))
      .sort((a, b) => Number(BigMath.abs(b.maxAmount) - BigMath.abs(a.maxAmount)));

    return { balances };
  }),

  addOrEditExpense: protectedProcedure
    .input(arrayify(createExpenseSchema))
    .mutation(async ({ input: expenses, ctx }) => upsertExpenses(expenses, ctx.session.user.id)),

  addOrEditCurrencyConversion: protectedProcedure
    .input(createCurrencyConversionSchema)
    .mutation(async ({ input, ctx }) => {
      const { amount, rate, from, to, senderId, receiverId, groupId, expenseId } = input;
      const storedGroupId = await validateExpenseWritePermission(
        expenseId,
        groupId,
        ctx.session.user.id,
      );

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
          { userId: senderId, amount },
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
        await assertExpenseGroupReassignment(
          storedGroupId,
          conversionFrom.groupId,
          conversionFrom.paidBy,
          conversionFrom.participants.map((participant) => participant.userId),
        );
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
    .input(paginationInput.extend({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const expenses = await db.expense.findMany({
        take: input.limit + 1,
        where: {
          ...beforeCursor(input.cursor, 'expenseDate'),
          ...expensesWithFriendWhere(ctx.session.user.id, input.friendId),
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
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
          group: {
            select: {
              id: true,
              name: true,
              simplifyDebts: true,
            },
          },
        },
      });

      return toPage(expenses, input.limit, (expense) => ({
        date: expense.expenseDate,
        id: expense.id,
      }));
    }),

  getGroupExpenses: groupProcedure
    .input(paginationInput.extend({ groupId: z.number() }))
    .query(async ({ input, ctx }) => {
      const expenses = await ctx.db.expense.findMany({
        take: input.limit + 1,
        where: {
          AND: [beforeCursor(input.cursor, 'expenseDate')],
          ...groupExpensesWhere(input.groupId),
        },
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        include: {
          expenseParticipants: true,
          paidByUser: true,
          deletedByUser: true,
          conversionTo: true,
        },
      });

      return toPage(expenses, input.limit, (expense) => ({
        date: expense.expenseDate,
        id: expense.id,
      }));
    }),

  getExpenseDetails: protectedProcedure
    .input(z.object({ expenseId: z.string() }))
    .query(async ({ input, ctx }) => {
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
          expenseNotes: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            include: {
              createdBy: {
                select: { id: true, name: true, email: true, image: true, deletedAt: true },
              },
            },
          },
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
                  command: true,
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

      if (
        expense &&
        expense.addedBy !== ctx.session.user.id &&
        expense.paidBy !== ctx.session.user.id &&
        !expense.expenseParticipants.some(
          (participant) => participant.userId === ctx.session.user.id,
        )
      ) {
        const membership =
          null === expense.groupId
            ? null
            : await db.groupUser.findUnique({
                where: {
                  groupId_userId: { groupId: expense.groupId, userId: ctx.session.user.id },
                },
              });
        if (!membership) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You cannot view this expense' });
        }
      }

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

  getAllExpenses: protectedProcedure.input(paginationInput).query(async ({ ctx, input }) => {
    const expenses = await db.expenseParticipant.findMany({
      take: input.limit + 1,
      where: {
        expense: beforeCursor(input.cursor, 'createdAt'),
        userId: ctx.session.user.id,
      },
      orderBy: [{ expense: { createdAt: 'desc' } }, { expenseId: 'desc' }],
      include: {
        expense: {
          include: {
            paidByUser: {
              select: {
                name: true,
                deletedAt: true,
                email: true,
                image: true,
                id: true,
              },
            },
            deletedByUser: {
              select: {
                name: true,
                deletedAt: true,
                email: true,
                image: true,
                id: true,
              },
            },
          },
        },
      },
    });

    return toPage(expenses, input.limit, (item) => ({
      date: item.expense.createdAt,
      id: item.expenseId,
    }));
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
                deletedAt: true,
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
      .map((r) => Object.assign(r, { expense: r.expense[0]! }));
  }),

  deleteRecurrence: protectedProcedure
    .input(z.object({ recurrenceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const recurrence = await db.expenseRecurrence.findUnique({
        where: { id: input.recurrenceId },
        include: {
          job: true,
          expense: {
            where: {
              expenseParticipants: {
                some: { userId: ctx.session.user.id },
              },
            },
            take: 1,
          },
        },
      });

      if (!recurrence || 0 === recurrence.expense.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurrence not found' });
      }

      // Unschedule the cron job
      await db.$executeRaw`SELECT cron.unschedule(${recurrence.job.jobname})`;

      // Delete the recurrence (cascade nulls recurrenceId on expenses)
      await db.expenseRecurrence.delete({ where: { id: input.recurrenceId } });
    }),

  updateRecurrence: protectedProcedure
    .input(
      z.object({ recurrenceId: z.number(), cronExpression: z.string().transform(cronToBackend) }),
    )
    .mutation(async ({ input, ctx }) => {
      const recurrence = await db.expenseRecurrence.findUnique({
        where: { id: input.recurrenceId },
        include: {
          job: true,
          expense: {
            where: {
              expenseParticipants: {
                some: { userId: ctx.session.user.id },
              },
            },
            take: 1,
          },
        },
      });

      if (!recurrence || 0 === recurrence.expense.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurrence not found' });
      }

      // Use cron.alter_job to update the schedule
      await db.$executeRaw`SELECT cron.alter_job(${recurrence.job.jobid}, schedule := ${getRecurrenceSchedule(input.cronExpression)})`;
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
      await validateExpenseWritePermission(input.expenseId, expense.groupId, ctx.session.user.id);

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

      const firstFrom = from[0];
      if (undefined === firstFrom) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing from currency code' });
      }

      if (!isCurrencyCode(firstFrom) || !from.every(isCurrencyCode) || !isCurrencyCode(to)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid currency code' });
      }

      const rates = new Map<string, number>();

      // Get the first rate to precache rates for the target currency
      const rate = await currencyRateProvider.getCurrencyRate(firstFrom, to, date);
      rates.set(firstFrom, rate);

      if (from.length > 1) {
        // Fetch rates for remaining currencies and return as map
        await Promise.all(
          from.slice(1).map(async (currency) => {
            const r = await currencyRateProvider.getCurrencyRate(currency, to, date);
            rates.set(currency, r);
          }),
        );
      }

      return { rates };
    }),
};

export const expenseRouter = createTRPCRouter(expenseMethods);

const validateEditExpensePermission = async (expenseId: string, userId: number): Promise<void> => {
  const [expenseParticipant, addedBy] = await Promise.all([
    db.expenseParticipant.findUnique({
      where: {
        expenseId_userId: {
          expenseId,
          userId,
        },
      },
    }),
    db.expense.findUnique({ where: { id: expenseId }, select: { addedBy: true } }),
  ]);

  if (!expenseParticipant && userId !== addedBy?.addedBy) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You are not the participant of the expense',
    });
  }
};

/**
 * Checks that the user may write the expense into `groupId` and returns the expense's stored
 * group (null for a new or ungrouped expense).
 */
const validateExpenseWritePermission = async (
  expenseId: string | undefined,
  groupId: number | null,
  userId: number,
): Promise<number | null> => {
  let storedGroupId: number | null = null;
  if (expenseId) {
    await validateEditExpensePermission(expenseId, userId);
    const expense = await db.expense.findUniqueOrThrow({
      where: { id: expenseId },
      select: { groupId: true },
    });
    // An ungrouped expense may be assigned to a group; a grouped expense keeps its group.
    if (null !== expense.groupId && expense.groupId !== groupId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot move an expense to another group',
      });
    }
    storedGroupId = expense.groupId;
  }
  if (null === groupId) {
    return storedGroupId;
  }
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { archivedAt: true, groupUsers: { where: { userId }, select: { userId: true } } },
  });
  if (!group) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group not found' });
  }
  if (0 === group.groupUsers.length) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a group member' });
  }
  if (group.archivedAt) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Group is archived' });
  }
  return storedGroupId;
};

/**
 * JSON has no BigInt or Date type, so the public API additionally accepts
 * plain JSON numbers (and numeric strings, for amounts beyond
 * `Number.MAX_SAFE_INTEGER`) and coerces them before validation by the shared
 * `createExpenseSchema` rules.
 */
const apiAmountSchema = z
  .union([z.bigint(), z.number().int().safe(), z.string().regex(/^-?\d+$/)])
  .transform((value) => BigInt(value));

const apiDateSchema = z
  .union([z.date(), z.string().datetime({ offset: true })])
  .transform((value) => new Date(value));

const apiCreateExpenseSchema = createExpenseSchema.extend({
  amount: apiAmountSchema,
  participants: z.array(z.object({ userId: z.number(), amount: apiAmountSchema })),
  expenseDate: apiDateSchema.optional(),
});

/**
 * API-only variant of `addOrEditExpense` mounted in the public API router.
 * Accepts a JSON array body (plain JSON or a superjson envelope) and runs the
 * exact same write path and permission checks as the app procedure.
 */
export const addOrEditExpenseApiProcedure = protectedProcedure
  .input(z.array(apiCreateExpenseSchema))
  .mutation(async ({ input: expenses, ctx }) => upsertExpenses(expenses, ctx.session.user.id));

/**
 * API-only variant of `getGroupExpenses` with offset pagination. Keeps the
 * `groupProcedure` membership check.
 */
export const getGroupExpensesApiProcedure = groupProcedure
  .input(z.object({ groupId: z.number() }).extend(apiPaginationInput.shape))
  .query(async ({ input, ctx }) => {
    const where = groupExpensesWhere(input.groupId);

    const [items, total] = await Promise.all([
      ctx.db.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        include: {
          expenseParticipants: true,
          paidByUser: true,
          deletedByUser: true,
          conversionTo: true,
        },
        take: input.limit,
        skip: input.offset,
      }),
      ctx.db.expense.count({ where }),
    ]);

    return paginatedResult(items, total, input);
  });

/**
 * API-only variant of `getExpensesWithFriend` with offset pagination.
 */
export const getExpensesWithFriendApiProcedure = protectedProcedure
  .input(z.object({ friendId: z.number() }).extend(apiPaginationInput.shape))
  .query(async ({ input, ctx }) => {
    const where = expensesWithFriendWhere(ctx.session.user.id, input.friendId);

    const [items, total] = await Promise.all([
      db.expense.findMany({
        where,
        // Tie-break with `id`: `expenseDate` is not unique and Postgres may return
        // Tied rows in an arbitrary order between queries, breaking pagination
        // For clients walking pages.
        orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        include: {
          expenseParticipants: {
            where: {
              OR: [{ userId: ctx.session.user.id }, { userId: input.friendId }],
            },
          },
          paidByUser: true,
          conversionTo: true,
          group: {
            select: {
              id: true,
              name: true,
              simplifyDebts: true,
            },
          },
        },
        take: input.limit,
        skip: input.offset,
      }),
      db.expense.count({ where }),
    ]);

    return paginatedResult(items, total, input);
  });

/**
 * API-only variant of `getAllExpenses` with offset pagination.
 */
export const getAllExpensesApiProcedure = protectedProcedure
  .input(apiPaginationInput.default({}))
  .query(async ({ input, ctx }) => {
    const where = { userId: ctx.session.user.id };

    const [items, total] = await Promise.all([
      db.expenseParticipant.findMany({
        where,
        // Tie-break on the composite primary key: rows sharing an expense
        // Have identical `expenseId`, so both halves are needed for a stable
        // Order across queries.
        orderBy: [
          { expense: { createdAt: 'desc' as const } },
          { expenseId: 'desc' as const },
          { userId: 'desc' as const },
        ],
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
        take: input.limit,
        skip: input.offset,
      }),
      db.expenseParticipant.count({ where }),
    ]);

    return paginatedResult(items, total, input);
  });

export type ExpenseRouter = typeof expenseRouter;
