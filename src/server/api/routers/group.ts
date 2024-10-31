import { SplitType } from '@prisma/client';
import { z } from 'zod';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { createGroupExpense } from '../services/splitService';
import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';

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
      const balances: Record<string, number> = {};

      for (const balance of g.group.groupBalances) {
        balances[balance.currency] = (balances[balance.currency] ?? 0) + balance.amount;
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

  addExpense: groupProcedure
    .input(
      z.object({
        paidBy: z.number(),
        name: z.string(),
        category: z.string(),
        amount: z.number(),
        transactionId: z.string().optional(),
        splitType: z.enum([
          SplitType.ADJUSTMENT,
          SplitType.EQUAL,
          SplitType.PERCENTAGE,
          SplitType.SHARE,
          SplitType.EXACT,
          SplitType.SETTLEMENT,
        ]),
        currency: z.string(),
        participants: z.array(z.object({ userId: z.number(), amount: z.number() })),
        fileKey: z.string().optional(),
        expenseDate: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await createGroupExpense(
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
          input.transactionId
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
        deletedBy: null,
      },
    });

    return totals;
  }),

  addMembers: groupProcedure
    .input(z.object({ userIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      console.log(input.userIds);
      const groupUsers = await ctx.db.groupUser.createMany({
        data: input.userIds.map((userId) => ({
          groupId: input.groupId,
          userId,
        })),
      });

      return groupUsers;
    }),

  leaveGroup: groupProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const nonZeroBalance = await ctx.db.groupBalance.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.session.user.id,
          amount: {
            not: 0,
          },
        },
      });

      if (nonZeroBalance) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have a non-zero balance in this group',
        });
      }

      const groupUser = await ctx.db.groupUser.delete({
        where: {
          groupId_userId: {
            groupId: input.groupId,
            userId: ctx.session.user.id,
          },
        },
      });

      return groupUser;
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

      const balanceWithNonZero = group?.groupBalances.find((b) => b.amount !== 0);

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
