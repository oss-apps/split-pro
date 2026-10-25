import { TRPCError } from '@trpc/server';
import { type Prisma, type PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { env } from '~/env';
import {
  deserializeDefaultSplit,
  serializeDefaultSplit,
  toSortedFriendPair,
} from '~/lib/defaultSplit';
import { claimInviteCooldown } from '~/lib/inviteCooldown';
import { InviteErrorCode } from '~/lib/error/invite';
import { getUserBalances } from '~/server/api/services/balanceQuery';
import { AppError } from '~/server/api/appError';
import { generateApiKey } from '~/server/api/apiKey';
import { paginatedResult, paginationInput } from '~/server/api/pagination';
import { balanceProcedure, createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { deleteAccount } from '~/server/api/services/deleteAccount';
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

const getVisibleFriendWhere = (userId: number, friendId: number) =>
  ({
    id: friendId,
    OR: [
      { userBalances: { some: { friendId: userId } } },
      {
        associatedGroups: {
          some: {
            group: {
              simplifyDebts: true,
              groupUsers: { some: { userId } },
            },
          },
        },
      },
    ],
  }) satisfies Prisma.UserWhereUniqueInput;

const throwInviteError = (
  code: 'PRECONDITION_FAILED' | 'TOO_MANY_REQUESTS' | 'INTERNAL_SERVER_ERROR',
  inviteErrorCode: (typeof InviteErrorCode)[keyof typeof InviteErrorCode],
  message: string,
): never => {
  throw new TRPCError({ code, message, cause: new AppError(inviteErrorCode, message) });
};

const MAX_API_KEYS_PER_USER = 10;

/**
 * Method record for `userRouter`, exported so the public API router
 * (`~/server/api/apiRouter`) can mount a curated subset of the same procedures
 * without duplicating them.
 */
export const userMethods = {
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAccount(ctx.db, ctx.session.user.id);
  }),

  me: protectedProcedure.query(({ ctx }) => ctx.session.user),

  getBalanceSettings: protectedProcedure.query(() => ({
    excludeFutureExpenses: env.EXCLUDE_FUTURE_EXPENSES,
  })),

  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const friends = await db.balanceView.findMany({
      where: { userId: ctx.session.user.id, friendId: { notIn: ctx.session.user.hiddenFriendIds } },
      include: { friend: true },
      distinct: ['friendId'],
    });

    return friends.map((f) => f.friend);
  }),

  getOwnExpenses: protectedProcedure.query(async ({ ctx }) => {
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
  }),

  inviteFriend: protectedProcedure
    .input(z.object({ email: z.string(), sendInviteEmail: z.boolean().optional() }))
    .mutation(async ({ input, ctx: { session } }) => {
      // Upsert avoids a find-then-create race where two concurrent invites for the same brand-new email both miss the lookup and hit the unique constraint.
      const user = await db.user.upsert({
        where: { email: input.email },
        update: {},
        create: {
          email: input.email,
          name: input.email.split('@')[0],
        },
      });

      // Only a just-created or not-yet-verified user should get an invite email.
      if (input.sendInviteEmail && !user.emailVerified) {
        if (!env.ENABLE_SENDING_INVITES) {
          throwInviteError(
            'PRECONDITION_FAILED',
            InviteErrorCode.INVITES_DISABLED,
            'Invite emails are disabled on this server.',
          );
        }

        if (!claimInviteCooldown(user.id, session.user.id)) {
          throwInviteError(
            'TOO_MANY_REQUESTS',
            InviteErrorCode.INVITE_RATE_LIMITED,
            'Please wait before re-sending an invite to this address.',
          );
        }

        let sent = false;
        try {
          sent = await sendInviteEmail(input.email, session.user.name ?? session.user.email ?? '');
        } catch (err) {
          console.error('Error sending invite email to user', user.id, err);
        }
        if (!sent) {
          throwInviteError(
            'INTERNAL_SERVER_ERROR',
            InviteErrorCode.INVITE_EMAIL_SEND_FAILED,
            'Failed to send invite email. Check your SMTP configuration.',
          );
        }
      }

      return user;
    }),

  getBalancesWithFriend: balanceProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const balances = await getUserBalances(ctx.db, ctx.session.user.id);
      return balances
        .filter((balance) => balance.friendId === input.friendId && 0n !== balance.amount)
        .map(({ friendId, currency, amount, groupId, group }) => ({
          friendId,
          currency,
          amount,
          groupId,
          groupName: group?.name ?? null,
        }));
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
          deletedAt: null,
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
      await sendFeedbackEmail(input.feedback, ctx.session.user);
    }),

  getFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const friend = await db.user.findUnique({
        where: getVisibleFriendWhere(ctx.session.user.id, input.friendId),
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
          const parsedShares = z
            .record(z.string(), z.string())
            .safeParse(friendDefaultSplit.shares);
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
    }),

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
        where: getVisibleFriendWhere(ctx.session.user.id, input.friendId),
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
};

export const userRouter = createTRPCRouter(userMethods);

/**
 * API-only variant of `getOwnExpenses` with offset pagination, mounted in the
 * public API router instead of the app router.
 */
export const getOwnExpensesApiProcedure = protectedProcedure
  .input(paginationInput.default({}))
  .query(async ({ input, ctx }) => {
    const where = { paidBy: ctx.session.user.id, deletedBy: null };

    const [items, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: { group: true },
        take: input.limit,
        skip: input.offset,
      }),
      db.expense.count({ where }),
    ]);

    return paginatedResult(items, total, input);
  });

export const getUserMap = async (userIds: number[], database: Pick<PrismaClient, 'user'> = db) => {
  const users = await database.user.findMany({
    where: {
      id: { in: userIds },
    },
  });

  return Object.fromEntries(users.map((u) => [u.id, u]));
};

export type UserRouter = typeof userRouter;
