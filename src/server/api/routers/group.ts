import { SplitType } from '@prisma/client';
import { z } from 'zod';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { createGroupExpense, deleteExpense } from '../services/splitService';
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
    const time = Date.now();
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
          },
        },
      },
    });

    const groupsWithBalances = groups.map((g) => {
      const balances: Record<string, number> = {};

      for (const balance of g.group.groupBalances) {
        if (balances[balance.currency] === undefined) {
          balances[balance.currency] = balance.amount;
        } else {
          balances[balance.currency] += balance.amount;
        }
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
          createdAt: 'desc',
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
        groupBalances: {
          where: { userId: ctx.session.user.id },
        },
      },
    });

    return group;
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
});
