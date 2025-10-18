import { SplitType } from '@prisma/client';
import { isCurrencyCode } from '~/lib/currency';

import { db } from '~/server/db';
import { pushNotification } from '~/server/notification';
import { getCurrencyHelpers } from '~/utils/numbers';

export async function sendExpensePushNotification(expenseId: string) {
  const expense = await db.expense.findUnique({
    where: {
      id: expenseId,
    },
    select: {
      paidBy: true,
      amount: true,
      currency: true,
      addedBy: true,
      name: true,
      deletedBy: true,
      splitType: true,
      deletedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      expenseParticipants: {
        select: {
          userId: true,
          amount: true,
        },
      },
      paidByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      addedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      updatedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!expense) {
    return;
  }

  const participants = expense.deletedBy
    ? expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.deletedBy && 0n !== amount,
      )
    : expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.addedBy && 0n !== amount,
      );

  const subscriptions = await db.pushNotification.findMany({
    where: {
      userId: {
        in: participants.map((p) => p.userId),
      },
    },
  });

  const { toUIString } = getCurrencyHelpers({
    currency: isCurrencyCode(expense.currency) ? expense.currency : 'USD',
  });

  const pushData = {
    ...(expense.deletedBy
      ? {
          title: `${expense.deletedByUser?.name ?? expense.deletedByUser?.email}`,
          message: `Deleted ${expense.name}`,
        }
      : expense.updatedByUser
        ? {
            title: `${expense.updatedByUser.name ?? expense.updatedByUser.email}`,
            message: `Updated ${expense.name} ${expense.currency} ${toUIString(expense.amount)}`,
          }
        : expense.splitType === SplitType.SETTLEMENT
          ? {
              title: `${expense.addedByUser.name ?? expense.addedByUser.email}`,
              message: `${expense.paidByUser.name ?? expense.paidByUser.email} settled up ${expense.currency} ${toUIString(expense.amount)}`,
            }
          : {
              title: `${expense.addedByUser.name ?? expense.addedByUser.email}`,
              message: `${expense.paidByUser.name ?? expense.paidByUser.email} paid  ${expense.currency} ${toUIString(expense.amount)} for ${expense.name}`,
            }),
    data: {
      url: `/expenses/${expenseId}`,
    },
  };

  const pushNotifications = subscriptions.map((s) => pushNotification(s.subscription, pushData));

  await Promise.all(pushNotifications);
}
