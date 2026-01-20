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
      conversionTo: {
        select: {
          currency: true,
          amount: true,
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

  // A way to localize it and reuse our utils would be ideal
  const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
    user?.name ?? user?.email ?? '';

  const formatAmount = (currency: string, amount: bigint) => {
    const { toUIString } = getCurrencyHelpers({
      currency: isCurrencyCode(currency) ? currency : 'USD',
    });
    return toUIString(amount);
  };

  const getNotificationContent = (): { title: string; message: string } => {
    const payer = getUserDisplayName(expense.paidByUser);
    const adder = getUserDisplayName(expense.addedByUser);
    const amount = formatAmount(expense.currency, expense.amount);

    // Deleted expense
    if (expense.deletedBy) {
      return {
        title: getUserDisplayName(expense.deletedByUser),
        message: `Deleted ${expense.name}`,
      };
    }

    // Updated expense
    if (expense.updatedByUser) {
      return {
        title: getUserDisplayName(expense.updatedByUser),
        message: `Updated ${expense.name} ${amount}`,
      };
    }

    // Currency conversion
    if (expense.splitType === SplitType.CURRENCY_CONVERSION && expense.conversionTo) {
      const toAmount = formatAmount(expense.conversionTo.currency, expense.conversionTo.amount);
      return {
        title: adder,
        message: `${payer} converted ${amount} → ${toAmount}`,
      };
    }

    // Settlement
    if (expense.splitType === SplitType.SETTLEMENT) {
      return {
        title: adder,
        message: `${payer} settled up ${amount}`,
      };
    }

    // Regular expense
    return {
      title: adder,
      message: `${payer} paid ${amount} for ${expense.name}`,
    };
  };

  const pushData = {
    ...getNotificationContent(),
    data: {
      url: `/expenses/${expenseId}`,
    },
  };

  const pushNotifications = subscriptions.map((s) => pushNotification(s.subscription, pushData));

  await Promise.all(pushNotifications);
}

export async function sendGroupSimplifyDebtsToggleNotification(
  groupId: number,
  togglerUserId: number,
  newState: boolean,
) {
  try {
    const group = await db.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        name: true,
        groupUsers: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return;
    }

    const togglerUser = await db.user.findUnique({
      where: {
        id: togglerUserId,
      },
      select: {
        name: true,
        email: true,
      },
    });

    if (!togglerUser) {
      return;
    }

    // Filter out the toggler from recipients
    const recipients = group.groupUsers.filter((gu) => gu.userId !== togglerUserId);

    if (recipients.length === 0) {
      return;
    }

    const subscriptions = await db.pushNotification.findMany({
      where: {
        userId: {
          in: recipients.map((r) => r.userId),
        },
      },
    });

    const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
      user?.name ?? user?.email ?? '';

    const togglerName = getUserDisplayName(togglerUser);
    const stateText = newState ? 'on' : 'off';

    const pushData = {
      title: togglerName,
      message: `turned ${stateText} debt simplification for ${group.name}`,
      data: {
        url: `/groups/${groupId}`,
      },
    };

    const pushNotifications = subscriptions.map((s) => pushNotification(s.subscription, pushData));

    await Promise.all(pushNotifications);
  } catch (error) {
    console.error('Error sending group simplify debts toggle notifications', error);
  }
}

export async function checkRecurrenceNotifications() {
  try {
    const recurrences = await db.expenseRecurrence.findMany({
      where: {
        NOT: {
          notified: true,
        },
      },
      include: {
        expense: {
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await Promise.all(
      recurrences
        .filter((r) => r.expense[0])
        .map(async (r) => {
          await sendExpensePushNotification(r.expense[0]!.id);
          await db.expenseRecurrence.update({
            where: {
              id: r.id,
            },
            data: {
              notified: true,
            },
          });
        }),
    );
  } catch (e) {
    console.error('Error sending recurrence notifications', e);
  } finally {
    setTimeout(checkRecurrenceNotifications, 1000 * 60); // Check every minute
  }
}
