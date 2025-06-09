import { SplitType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { simplifyDebts } from '~/lib/simplify';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';

import {
  createGroupExpense,
  editExpense,
  recalculateGroupBalances,
} from '../services/splitService';

export const groupRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), currency: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.create({
        data: {
          name: input.name,
          publicId: nanoid(),
          userId: ctx.session.user.id,
          defaultCurrency: input.currency ?? 'USD',
          groupUsers: {
            create: {
              userId: ctx.session.user.id,
            },
          },
        },
      });

      return group;
    }),

  getAllGroups: protectedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.db.groupUser.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        group: {
          include: {
            groupUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    return groups;
  }),

  getAllGroupsWithBalances: protectedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.db.groupUser.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        group: {
          include: {
            groupBalances: {
              where: { userId: ctx.session.user.id },
            },
            expenses: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    const sortedGroupsByLatestExpense = groups.sort((a, b) => {
      const aDate = a.group.expenses[0]?.createdAt ?? new Date(0);
      const bDate = b.group.expenses[0]?.createdAt ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

    const groupsWithBalances = sortedGroupsByLatestExpense.map((g) => {
      const balances: Record<string, bigint> = {};

      for (const balance of g.group.groupBalances) {
        balances[balance.currency] = (balances[balance.currency] ?? 0n) + balance.amount;
      }

      return {
        ...g.group,
        balances,
      };
    });

    return groupsWithBalances;
  }),

  joinGroup: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.db.group.findFirst({
        where: {
          publicId: input.groupId,
        },
      });

      if (!group) {
        throw new Error('Group not found');
      }

      await ctx.db.groupUser.create({
        data: {
          groupId: group.id,
          userId: ctx.session.user.id,
        },
      });

      return group;
    }),

  addOrEditExpense: groupProcedure
    .input(
      z.object({
        paidBy: z.number(),
        name: z.string(),
        category: z.string(),
        amount: z.bigint(),
        splitType: z.enum([
          SplitType.ADJUSTMENT,
          SplitType.EQUAL,
          SplitType.PERCENTAGE,
          SplitType.SHARE,
          SplitType.EXACT,
          SplitType.SETTLEMENT,
        ]),
        currency: z.string(),
        participants: z.array(z.object({ userId: z.number(), amount: z.bigint() })),
        fileKey: z.string().optional(),
        expenseDate: z.date().optional(),
        expenseId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.expenseId) {
        const expenseParticipant = await db.expenseParticipant.findUnique({
          where: {
            expenseId_userId: {
              expenseId: input.expenseId,
              userId: ctx.session.user.id,
            },
          },
        });

        if (!expenseParticipant) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You are not the participant of the expense',
          });
        }
      }

      try {
        const expense = input.expenseId
          ? await editExpense(
              input.expenseId,
              input.paidBy,
              input.name,
              input.category,
              input.amount,
              input.splitType,
              input.currency,
              input.participants,
              ctx.session.user.id,
              input.expenseDate ?? new Date(),
              input.fileKey,
            )
          : await createGroupExpense(
              input.groupId,
              input.paidBy,
              input.name,
              input.category,
              input.amount,
              input.splitType,
              input.currency,
              input.participants,
              ctx.session.user.id,
              input.expenseDate ?? new Date(),
              input.fileKey,
            );

        return expense;
      } catch (error) {
        console.error(error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create expense' });
      }
    }),

  getExpenses: groupProcedure
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

  getExpenseDetails: groupProcedure
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
        },
      });

      return expense;
    }),

  getGroupDetails: groupProcedure.query(async ({ input, ctx }) => {
    const group = await ctx.db.group.findUnique({
      where: {
        id: input.groupId,
      },
      include: {
        groupUsers: {
          include: {
            user: true,
          },
        },
        groupBalances: true,
      },
    });

    if (group?.simplifyDebts) {
      group.groupBalances = simplifyDebts(group.groupBalances);
    }

    return group;
  }),

  getGroupTotals: groupProcedure.query(async ({ input, ctx }) => {
    const totals = await ctx.db.expense.groupBy({
      by: 'currency',
      _sum: {
        amount: true,
      },
      where: {
        groupId: input.groupId,
        deletedAt: null,
      },
    });

    return totals;
  }),

  addMembers: groupProcedure
    .input(z.object({ userIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const groupUsers = await ctx.db.groupUser.createMany({
        data: input.userIds.map((userId) => ({
          groupId: input.groupId,
          userId,
        })),
      });

      return groupUsers;
    }),

  recalculateBalances: groupProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
      });

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      if (group.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Only creator can recalculate balances',
        });
      }

      return recalculateGroupBalances(input.groupId);
    }),

  toggleSimplifyDebts: groupProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
      });

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      const isInGroup = await ctx.db.groupUser.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.session.user.id,
        },
      });

      if (!isInGroup) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Only group members can toggle Simplify Debts',
        });
      }

      const simplifyDebts = !group.simplifyDebts;

      await ctx.db.group.update({
        where: {
          id: input.groupId,
        },
        data: {
          simplifyDebts,
        },
      });

      return simplifyDebts;
    }),

  leaveGroup: groupProcedure
    .input(z.object({ groupId: z.number(), userId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const userId = input.userId ?? ctx.session.user.id;
      const nonZeroBalance = await ctx.db.groupBalance.findFirst({
        where: {
          groupId: input.groupId,
          userId,
          amount: {
            not: 0,
          },
        },
      });

      if (nonZeroBalance) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User has a non-zero balance in this group',
        });
      }

      const group = await ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
      });
      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      if (group.userId !== ctx.session.user.id && userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Only group creator can remove someone from the group',
        });
      }

      const groupUser = await ctx.db.groupUser.delete({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId,
          },
        },
      });

      return groupUser;
    }),

  updateGroupDetails: groupProcedure
    .input(z.object({ name: z.string().min(1), groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
      });

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      if (group.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Only creator can update the group' });
      }

      const updatedGroup = await ctx.db.group.update({
        where: {
          id: input.groupId,
        },
        data: {
          name: input.name,
        },
      });

      return updatedGroup;
    }),

  delete: groupProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const group = await ctx.db.group.findUnique({
        where: {
          id: input.groupId,
        },
        include: {
          groupBalances: true,
        },
      });

      if (group?.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Only creator can delete the group' });
      }

      const balanceWithNonZero = group?.groupBalances.find((b) => b.amount !== 0n);

      if (balanceWithNonZero) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have a non-zero balance in this group',
        });
      }

      await ctx.db.group.delete({
        where: {
          id: input.groupId,
        },
      });

      return group;
    }),
});

export type GroupRouter = typeof groupRouter;
