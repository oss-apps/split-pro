import { SplitType } from '@prisma/client';
import { getAllBalancesForGroup, getGroupsWithBalances } from '@prisma/client/sql';

import { TRPCError } from '@trpc/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { simplifyDebts } from '~/lib/simplify';
import { createTRPCRouter, groupProcedure, protectedProcedure } from '~/server/api/trpc';

import { recalculateGroupBalances } from '../services/splitService';

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

  getAllGroupsWithBalances: protectedProcedure
    .input(z.object({ getArchived: z.boolean() }).optional())
    .query(async ({ ctx, input }) => {
      let groupBalances = await ctx.db.$queryRawTyped(getGroupsWithBalances(ctx.session.user.id));

      // filter out archived groups if getArchived is false
      if (!input?.getArchived) {
        groupBalances.filter((b) => b.archivedAt != null);
      }
      const _groups = groupBalances
        .map((b) => {
          return {
            id: b.id,
            name: b.name,
          };
        })
        .filter((obj, index, self) => index === self.findIndex((t) => t.id === obj.id));

      const groupsWithBalances = _groups.map((group) => {
        const balancesForGroup: Record<string, bigint> = {};
        groupBalances
          .filter((b) => {
            return b.id == group.id;
          })
          .forEach((b) => {
            if (b.currency != null && b.balance != null) {
              balancesForGroup[b.currency] = b.balance;
            }
          });

        return {
          ...group,
          balances: balancesForGroup,
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

  getGroupDetails: groupProcedure.query(async ({ input, ctx }) => {
    const group = await ctx.db.group.findUniqueOrThrow({
      where: {
        id: input.groupId,
      },
      include: {
        groupUsers: {
          include: {
            user: true,
          },
        },
      },
    });

    const balances = await ctx.db.$queryRawTyped(getAllBalancesForGroup(input.groupId));

    const reverseBalances = balances.map((b) => {
      return {
        ...b,
        borrowedBy: b.paidBy,
        paidBy: b.borrowedBy,
        amount: b.amount != null ? -b.amount : 0n,
      };
    });

    const groupWithBalances = {
      ...group,
      groupBalances: balances.concat(reverseBalances),
    };

    if (groupWithBalances?.simplifyDebts) {
      groupWithBalances.groupBalances = simplifyDebts(groupWithBalances.groupBalances);
    }

    return groupWithBalances;
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

      const groupBalances = await ctx.db.$queryRawTyped(getAllBalancesForGroup(input.groupId));

      const finalGroupBalances = group.simplifyDebts ? simplifyDebts(groupBalances) : groupBalances;

      if (finalGroupBalances.some((b) => b.paidBy === userId && 0n !== b.amount)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'User has a non-zero balance in this group',
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

  toggleArchive: groupProcedure
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

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group not found' });
      }

      // Check if user is a member of the group
      const isInGroup = await ctx.db.groupUser.findFirst({
        where: {
          groupId: input.groupId,
          userId: ctx.session.user.id,
        },
      });

      if (!isInGroup) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Only group members can archive/unarchive the group',
        });
      }

      const isArchiving = !group.archivedAt;

      // Only check balances when archiving (not when unarchiving)
      if (isArchiving) {
        const groupBalances = await ctx.db.$queryRawTyped(getAllBalancesForGroup(input.groupId));

        const balanceWithNonZero = groupBalances.find((b) => 0n !== b.amount);

        if (balanceWithNonZero) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message:
              'Cannot archive group with outstanding balances. All balances must be settled first.',
          });
        }
      }

      const updatedGroup = await ctx.db.group.update({
        where: {
          id: input.groupId,
        },
        data: {
          archivedAt: isArchiving ? new Date() : null,
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

      const groupBalances = await ctx.db.$queryRawTyped(getAllBalancesForGroup(input.groupId));

      const balanceWithNonZero = groupBalances.find((b) => 0n !== b.amount);

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
