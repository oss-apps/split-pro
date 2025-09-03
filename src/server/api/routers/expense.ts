import { randomUUID } from 'crypto';

import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { getDocumentUploadUrl } from '~/server/storage';
import { BigMath } from '~/utils/numbers';

import { createExpenseSchema } from '~/types/expense.types';
import { createExpense, deleteExpense, editExpense } from '../services/splitService';

export const expenseRouter = createTRPCRouter({
  getBalances: protectedProcedure.query(async ({ ctx }) => {
    const balancesRaw = await db.balance.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        amount: 'desc',
      },
      include: {
        friend: true,
      },
    });

    const balances = balancesRaw
      .reduce<((typeof balancesRaw)[number] & { hasMore?: boolean })[]>((acc, current) => {
        const existing = acc.findIndex((item) => item.friendId === current.friendId);
        if (-1 === existing) {
          acc.push(current);
        } else {
          const existingItem = acc[existing];
          if (existingItem) {
            if (BigMath.abs(existingItem.amount) > BigMath.abs(current.amount)) {
              acc[existing] = { ...existingItem, hasMore: true };
            } else {
              acc[existing] = { ...current, hasMore: true };
            }
          }
        }
        return acc;
      }, [])
      .sort((a, b) => Number(BigMath.abs(b.amount) - BigMath.abs(a.amount)));

    const cumulatedBalances = await db.balance.groupBy({
      by: ['currency'],
      _sum: {
        amount: true,
      },
      where: {
        userId: ctx.session.user.id,
      },
    });

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

    return { balances, cumulatedBalances, youOwe, youGet };
  }),

  addOrEditExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.expenseId) {
        await validateEditExpensePermission(input.expenseId, ctx.session.user.id);
      }

      if (input.groupId) {
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

        return expense;
      } catch (error) {
        console.error(error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create expense' });
      }
    }),

  getExpensesWithFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const expenses = await db.expense.findMany({
        where: {
          OR: [
            {
              paidBy: ctx.session.user.id,
              expenseParticipants: {
                some: {
                  userId: input.friendId,
                },
              },
            },
            {
              paidBy: input.friendId,
              expenseParticipants: {
                some: {
                  userId: ctx.session.user.id,
                },
              },
            },
          ],
          AND: [
            {
              deletedBy: null,
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
        },
        orderBy: {
          expenseDate: 'desc',
        },
        include: {
          expenseParticipants: true,
          paidByUser: true,
          deletedByUser: true,
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
        },
      });

      if (expense?.groupId) {
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

      if (expense.groupId) {
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
