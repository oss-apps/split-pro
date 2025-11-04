import { TRPCError } from '@trpc/server';
import { type User } from 'next-auth';
import { z } from 'zod';

import { env } from '~/env';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { sendFeedbackEmail, sendInviteEmail } from '~/server/mailer';
import {
  SplitwiseExpenseSchema,
  SplitwiseGroupSchema,
  SplitwiseUserWithBalanceSchema,
} from '~/types';

// import { sendExpensePushNotification } from '../services/notificationService';
import {
  getCompleteFriendsDetails,
  getCompleteGroupDetails,
  importExpenseFromSplitwise,
  importGroupFromSplitwise,
  importUserBalanceFromSplitWise,
} from '../services/splitService';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ctx.session.user),

  getFriends: protectedProcedure.query(async ({ ctx }) => {
    const balanceWithFriends = await db.balance.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        friendId: true,
      },
      distinct: ['friendId'],
    });

    const friendsIds = balanceWithFriends.map((friend) => friend.friendId);

    const friends = await db.user.findMany({
      where: {
        id: {
          in: friendsIds,
        },
      },
    });

    return friends;
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

  getBalancesWithFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .query(async ({ input, ctx }) => {
      const balances = db.balance.findMany({
        where: {
          userId: ctx.session.user.id,
          friendId: input.friendId,
          amount: {
            not: 0,
          },
        },
      });

      return balances;
    }),

  updateUserDetail: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        currency: z.string().optional(),
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

  // sendExpensePushNotification: protectedProcedure
  //   .input(z.object({ expenseId: z.string() }))
  //   .mutation(async ({ input }) => {
  //     sendExpensePushNotification(input.expenseId).catch((err) => {
  //       console.error('Error sending push notification', err);
  //       throw new TRPCError({
  //         code: 'INTERNAL_SERVER_ERROR',
  //         message: 'Failed to send push notification',
  //       });
  //     });
  //   }),

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

  getFriend: protectedProcedure
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

      return friend;
    }),

  updatePushNotification: protectedProcedure
    .input(z.object({ subscription: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.pushNotification.upsert({
        where: {
          userId: ctx.session.user.id,
        },
        create: {
          userId: ctx.session.user.id,
          subscription: input.subscription,
        },
        update: {
          subscription: input.subscription,
        },
      });
    }),

  deleteFriend: protectedProcedure
    .input(z.object({ friendId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const friendBalances = await db.balance.findMany({
        where: {
          userId: ctx.session.user.id,
          friendId: input.friendId,
          amount: {
            not: 0,
          },
        },
      });

      if (0 < friendBalances.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have outstanding balances with this friend',
        });
      }

      await db.balance.deleteMany({
        where: {
          userId: input.friendId,
          friendId: ctx.session.user.id,
        },
      });

      await db.balance.deleteMany({
        where: {
          friendId: input.friendId,
          userId: ctx.session.user.id,
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
        usersWithBalance: z.array(SplitwiseUserWithBalanceSchema),
        groups: z.array(SplitwiseGroupSchema),
        expenses: z.array(SplitwiseExpenseSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await importUserBalanceFromSplitWise(ctx.session.user.id, input.usersWithBalance);
      await importGroupFromSplitwise(ctx.session.user.id, input.groups);
      await importExpenseFromSplitwise(
        ctx.session.user.id,
        input.expenses,
        input.usersWithBalance,
        input.groups,
      );
    }),

  getWebPushPublicKey: protectedProcedure.query(() => env.WEB_PUSH_PUBLIC_KEY ?? ''),
});

export type UserRouter = typeof userRouter;
