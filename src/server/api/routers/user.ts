import { randomUUID } from 'crypto';

import { SplitType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { env } from '~/env';
import { FILE_SIZE_LIMIT } from '~/lib/constants';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import { sendFeedbackEmail, sendInviteEmail } from '~/server/mailer';
import { getDocumentUploadUrl } from '~/server/storage';
import { SplitwiseGroupSchema, SplitwiseUserSchema } from '~/types';
import { BigMath } from '~/utils/numbers';

// import { sendExpensePushNotification } from '../services/notificationService';
import {
  addUserExpense,
  deleteExpense,
  editExpense,
  getCompleteFriendsDetails,
  getCompleteGroupDetails,
  importGroupFromSplitwise,
  importUserBalanceFromSplitWise,
} from '../services/splitService';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.session.user;
  }),

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
      .reduce(
        (acc, current) => {
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
        },
        [] as ((typeof balancesRaw)[number] & { hasMore?: boolean })[],
      )
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

    const friendsIds = balanceWithFriends.map((f) => f.friendId);

    const friends = await db.user.findMany({
      where: {
        id: {
          in: friendsIds,
        },
      },
    });

    return friends;
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

  addOrEditExpense: protectedProcedure
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
          : await addUserExpense(
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

  updateUserDetail: protectedProcedure
    .input(z.object({ name: z.string().optional(), currency: z.string().optional() }))
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

      await deleteExpense(input.expenseId, ctx.session.user.id);
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
    const user = ctx.session.user;

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

  getWebPushPublicKey: protectedProcedure.query(() => {
    return env.WEB_PUSH_PUBLIC_KEY ?? '';
  }),
});

export type UserRouter = typeof userRouter;
