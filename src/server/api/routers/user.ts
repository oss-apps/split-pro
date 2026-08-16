import { TRPCError } from '@trpc/server';
import { type User } from 'next-auth';
import { z } from 'zod';

import { env } from '~/env';
import {
  deserializeDefaultSplit,
  serializeDefaultSplit,
  toSortedFriendPair,
} from '~/lib/defaultSplit';
import { simplifyDebts } from '~/lib/simplify';
import { generateApiKey } from '~/server/api/apiKey';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { paginatedResult, paginationInput } from '~/server/api/pagination';
import { db } from '~/server/db';
import { sendFeedbackEmail, sendInviteEmail } from '~/server/mailer';
import { SplitwiseGroupSchema, SplitwiseUserSchema } from '~/types';

import {
  getSubscriptionEndpoint,
  sendPushNotificationToUsers,
} from '../services/notificationService';
import {
  getCompleteFriendsDetails,
  getCompleteGroupDetails,
  importGroupFromSplitwise,
  importUserBalanceFromSplitWise,
} from '../services/splitService';

const MAX_API_KEYS_PER_USER = 10;

/**
 * Returns the authenticated user. Exported standalone so it can be shared
 * between `userRouter` (cookie auth) and the public `apiRouter` (API-key auth).
 */
export const meProcedure = protectedProcedure.query(({ ctx }) => ctx.session.user);

export const getFriendsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const friends = await db.balanceView.findMany({
    where: { userId: ctx.session.user.id, friendId: { notIn: ctx.session.user.hiddenFriendIds } },
    include: { friend: true },
    distinct: ['friendId'],
  });

  return friends.map((f) => f.friend);
});

export const getOwnExpensesProcedure = protectedProcedure.query(async ({ ctx }) => {
  const expenses = await db.expense.findMany({
    where: {
      paidBy: ctx.session.user.id,
      deletedBy: null,
    },
    orderBy: {
      expenseDate: 'desc',
    },
    include: {
      group: true,
    },
  });

  return expenses;
});

export const getOwnExpensesApiProcedure = protectedProcedure
  .input(paginationInput.optional())
  .query(async ({ input, ctx }) => {
    const limit = input?.limit ?? 20;
    const offset = input?.offset ?? 0;
    const where = { paidBy: ctx.session.user.id, deletedBy: null };

    const [items, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: { group: true },
        take: limit,
        skip: offset,
      }),
      db.expense.count({ where }),
    ]);

    return paginatedResult(items, total, input ?? undefined);
  });

export const getBalancesWithFriendProcedure = protectedProcedure
  .input(z.object({ friendId: z.number() }))
  .query(async ({ input, ctx }) => {
    const rawBalances = await db.balanceView.findMany({
      where: {
        userId: ctx.session.user.id,
        friendId: input.friendId,
        amount: { not: 0 },
      },
      include: {
        group: {
          select: {
            name: true,
            simplifyDebts: true,
          },
        },
      },
    });

    const processedBalances = await Promise.all(
      rawBalances.map(async ({ groupId, currency, amount, group }) => {
        if (!group?.simplifyDebts || null === groupId) {
          return {
            friendId: input.friendId,
            currency,
            amount,
            groupId,
            groupName: group?.name ?? null,
          };
        }

        const allGroupBalances = await db.balanceView.findMany({
          where: { groupId, currency },
        });

        const simplified = simplifyDebts(allGroupBalances);

        const simplifiedBalance = simplified.find(
          (b) =>
            b.userId === ctx.session.user.id &&
            b.friendId === input.friendId &&
            b.currency === currency,
        );

        return {
          friendId: input.friendId,
          currency,
          amount: simplifiedBalance?.amount ?? 0n,
          groupId,
          groupName: group.name,
        };
      }),
    );

    return processedBalances.filter((b) => 0n !== b.amount);
  });

export const getFriendProcedure = protectedProcedure
  .input(z.object({ friendId: z.number() }))
  .query(async ({ input, ctx }) => {
    const friend = await db.user.findUnique({
      where: {
        id: input.friendId,
        userBalances: {
          some: {
            friendId: ctx.session.user.id,
          },
        },
      },
    });

    if (!friend) {
      return friend;
    }

    const [userAId, userBId] = toSortedFriendPair(ctx.session.user.id, input.friendId);

    const friendDefaultSplit = await db.friendDefaultSplit.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
    });

    const defaultSplit =
      friendDefaultSplit &&
      (() => {
        const parsedShares = z.record(z.string(), z.string()).safeParse(friendDefaultSplit.shares);
        if (!parsedShares.success) {
          return null;
        }

        return deserializeDefaultSplit({
          splitType: friendDefaultSplit.splitType,
          shares: parsedShares.data,
        });
      })();

    return {
      ...friend,
      defaultSplit: defaultSplit ? serializeDefaultSplit(defaultSplit) : null,
    };
  });

export const userRouter = createTRPCRouter({
  me: meProcedure,
  getFriends: getFriendsProcedure,
  getOwnExpenses: getOwnExpensesProcedure,
  getBalancesWithFriend: getBalancesWithFriendProcedure,

  inviteFriend: protectedProcedure
    .input(z.object({ email: z.string(), sendInviteEmail: z.boolean().optional() }))
    .mutation(async ({ input, ctx: { session } }) => {
      const friend = await db.user.findUnique({
        where: {
          email: input.email,
        },
      });

      if (friend) {
        return friend;
      }

      const user = await db.user.create({
        data: {
          email: input.email,
          name: input.email.split('@')[0],
        },
      });

      if (input.sendInviteEmail) {
        sendInviteEmail(input.email, session.user.name ?? session.user.email ?? '').catch((err) => {
          console.error('Error sending invite email', err);
        });
      }

      return user;
    }),

  updateUserDetail: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        image: z.string().nullable().optional(),
        currency: z.string().optional(),
        defaultCurrency: z.string().nullable().optional(),
        obapiProviderId: z.string().optional(),
        bankingId: z.string().optional(),
        preferredLanguage: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          ...input,
        },
      });

      return user;
    }),

  getUserDetails: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({
        where: {
          id: input.userId,
        },
      });

      return user;
    }),

  submitFeedback: protectedProcedure
    .input(z.object({ feedback: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      await sendFeedbackEmail(input.feedback, ctx.session.user as User);
    }),

  getFriend: getFriendProcedure,

  upsertFriendDefaultSplit: protectedProcedure
    .input(
      z.object({
        friendId: z.number(),
        defaultSplit: z.object({
          splitType: z.enum(['EQUAL', 'PERCENTAGE', 'SHARE']),
          shares: z.record(z.string(), z.string()),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const friend = await db.user.findUnique({
        where: {
          id: input.friendId,
          userBalances: {
            some: {
              friendId: ctx.session.user.id,
            },
          },
        },
      });

      if (!friend) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Friend not found' });
      }

      const parsed = deserializeDefaultSplit(input.defaultSplit);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Malformed default split' });
      }

      const [userAId, userBId] = toSortedFriendPair(ctx.session.user.id, input.friendId);
      const serialized = serializeDefaultSplit(parsed);

      await db.friendDefaultSplit.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: {
          userAId,
          userBId,
          splitType: serialized.splitType,
          shares: serialized.shares,
        },
        update: {
          splitType: serialized.splitType,
          shares: serialized.shares,
        },
      });

      return serialized;
    }),

  clearFriendDefaultSplit: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [userAId, userBId] = toSortedFriendPair(ctx.session.user.id, input.friendId);
      await db.friendDefaultSplit.deleteMany({ where: { userAId, userBId } });
      return true;
    }),

  updatePushNotification: protectedProcedure
    .input(z.object({ subscription: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const endpoint = getSubscriptionEndpoint(input.subscription);

      if (!endpoint) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid push subscription payload',
        });
      }

      await db.pushNotification.upsert({
        where: {
          userId_endpoint: {
            userId: ctx.session.user.id,
            endpoint,
          },
        },
        create: {
          userId: ctx.session.user.id,
          endpoint,
          subscription: input.subscription,
        },
        update: {
          subscription: input.subscription,
        },
      });
    }),

  deletePushNotification: protectedProcedure
    .input(z.object({ subscription: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const endpoint = getSubscriptionEndpoint(input.subscription);
      if (!endpoint) {
        return;
      }

      await db.pushNotification
        .delete({
          where: {
            userId_endpoint: {
              userId: ctx.session.user.id,
              endpoint,
            },
          },
        })
        .catch(() => null);
    }),

  sendTestPushNotification: protectedProcedure.mutation(async ({ ctx }) => {
    const { sentCount } = await sendPushNotificationToUsers([ctx.session.user.id], {
      title: 'SplitPro',
      message: 'Test notification from debug info',
      data: {
        url: '/account',
      },
    });

    return { sentCount };
  }),

  deleteFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const friendBalances = await db.balanceView.groupBy({
        by: ['currency'],
        _sum: { amount: true },
        where: {
          userId: ctx.session.user.id,
          friendId: input.friendId,
          amount: { not: 0 },
        },
        having: {
          amount: {
            _sum: {
              not: 0,
            },
          },
        },
      });

      if (0 < friendBalances.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have outstanding balances with this friend',
        });
      }

      await db.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          hiddenFriendIds: {
            push: input.friendId,
          },
        },
      });
    }),

  downloadData: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx.session;

    const friends = await getCompleteFriendsDetails(user.id);
    const groups = await getCompleteGroupDetails(user.id);

    return { friends, groups };
  }),

  importUsersFromSplitWise: protectedProcedure
    .input(
      z.object({
        usersWithBalance: z.array(SplitwiseUserSchema),
        groups: z.array(SplitwiseGroupSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await importUserBalanceFromSplitWise(ctx.session.user.id, input.usersWithBalance);
      await importGroupFromSplitwise(ctx.session.user.id, input.groups);
    }),

  getWebPushPublicKey: protectedProcedure.query(() => env.WEB_PUSH_PUBLIC_KEY ?? ''),

  listApiKeys: protectedProcedure.query(async ({ ctx }) =>
    db.apiKey.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        partialKey: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  createApiKey: protectedProcedure
    .input(
      z.object({ name: z.string().min(1).max(100), expiresAt: z.date().nullable().optional() }),
    )
    .mutation(async ({ input, ctx }) => {
      const keyCount = await db.apiKey.count({ where: { userId: ctx.session.user.id } });
      if (keyCount >= MAX_API_KEYS_PER_USER) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `You can have at most ${MAX_API_KEYS_PER_USER} API keys`,
        });
      }

      const { key, hashedKey, partialKey } = generateApiKey();

      const apiKey = await db.apiKey.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          hashedKey,
          partialKey,
          expiresAt: input.expiresAt ?? null,
        },
        select: { id: true, name: true, partialKey: true, expiresAt: true, createdAt: true },
      });

      // `key` is the plaintext value, returned exactly once and never stored.
      return { ...apiKey, key };
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { count } = await db.apiKey.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (0 === count) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found' });
      }

      return { success: true };
    }),
});

export const getUserMap = async (userIds: number[]) => {
  const users = await db.user.findMany({
    where: {
      id: { in: userIds },
    },
  });

  return Object.fromEntries(users.map((u) => [u.id, u]));
};

export type UserRouter = typeof userRouter;
