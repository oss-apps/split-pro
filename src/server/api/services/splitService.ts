import { SplitType } from '@prisma/client';
import exp from 'constants';
import { db } from '~/server/db';
import { pushNotification } from '~/server/notification';
import { toFixedNumber, toInteger } from '~/utils/numbers';

export async function joinGroup(userId: number, publicGroupId: string) {
  const group = await db.group.findUnique({
    where: {
      publicId: publicGroupId,
    },
  });

  if (!group) {
    throw new Error('Group not found');
  }

  await db.groupUser.create({
    data: {
      groupId: group.id,
      userId,
    },
  });

  return group;
}

export async function createGroupExpense(
  groupId: number,
  paidBy: number,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: { userId: number; amount: number }[],
  currentUserId: number,
  expenseDate: Date,
  fileKey?: string,
) {
  const operations = [];

  const modifiedAmount = toInteger(amount);

  // Create expense operation
  operations.push(
    db.expense.create({
      data: {
        groupId,
        paidBy,
        name,
        category,
        amount: modifiedAmount,
        splitType,
        currency,
        expenseParticipants: {
          create: participants.map((participant) => ({
            userId: participant.userId,
            amount: toInteger(participant.amount),
          })),
        },
        fileKey,
        addedBy: currentUserId,
        expenseDate,
      },
    }),
  );

  // Update group balances and overall balances operations
  participants.forEach((participant) => {
    if (participant.userId === paidBy) {
      return;
    }

    //participant.amount will be in negative

    // Update balance where participant owes to the payer
    operations.push(
      db.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
        create: {
          groupId,
          currency,
          userId: paidBy,
          firendId: participant.userId,
          amount: -toInteger(participant.amount),
        },
      }),
    );

    // Update balance where payer owes to the participant (opposite balance)
    operations.push(
      db.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            firendId: paidBy,
            userId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
        create: {
          groupId,
          currency,
          userId: participant.userId,
          firendId: paidBy,
          amount: toInteger(participant.amount), // Negative because it's the opposite balance
        },
      }),
    );

    // Update payer's balance towards the participant
    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: paidBy,
            currency,
            friendId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -toInteger(participant.amount),
        },
      }),
    );

    // Update participant's balance towards the payer
    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency,
            friendId: paidBy,
          },
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: toInteger(participant.amount), // Negative because it's the opposite balance
        },
      }),
    );
  });

  // Execute all operations in a transaction
  const result = await db.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    participants.map((p) => p.userId),
    currency,
  );
  if (result[0]) {
    sendExpensePushNotification(result[0].id).catch(console.error);
  }
  return result[0];
}

export async function addUserExpense(
  paidBy: number,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: { userId: number; amount: number }[],
  currentUserId: number,
  expenseDate: Date,
  fileKey?: string,
) {
  const operations = [];

  // Create expense operation
  operations.push(
    db.expense.create({
      data: {
        paidBy,
        name,
        category,
        amount: toInteger(amount),
        splitType,
        currency,
        expenseParticipants: {
          create: participants.map((participant) => ({
            userId: participant.userId,
            amount: toInteger(participant.amount),
          })),
        },
        fileKey,
        addedBy: currentUserId,
        expenseDate,
      },
    }),
  );

  // Update group balances and overall balances operations
  participants.forEach((participant) => {
    // Update payer's balance towards the participant
    if (participant.userId === paidBy) {
      return;
    }

    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: paidBy,
            currency,
            friendId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -toInteger(participant.amount),
        },
      }),
    );

    // Update participant's balance towards the payer
    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency,
            friendId: paidBy,
          },
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: toInteger(participant.amount), // Negative because it's the opposite balance
        },
      }),
    );
  });

  // Execute all operations in a transaction
  const result = await db.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    participants.map((p) => p.userId),
    currency,
  );
  if (result[0]) {
    sendExpensePushNotification(result[0].id).catch(console.error);
  }
  return result[0];
}

async function updateGroupExpenseForIfBalanceIsZero(
  userId: number,
  friendIds: Array<number>,
  currency: string,
) {
  console.log('Checking for users with 0 balance to reflect in group');
  const balances = await db.balance.findMany({
    where: {
      userId,
      currency,
      friendId: {
        in: friendIds,
      },
      amount: 0,
    },
  });

  console.log('Total balances needs to be updated:', balances.length);

  if (balances.length) {
    await db.groupBalance.updateMany({
      where: {
        userId,
        firendId: {
          in: friendIds,
        },
        currency,
      },
      data: {
        amount: 0,
      },
    });

    await db.groupBalance.updateMany({
      where: {
        userId: {
          in: friendIds,
        },
        firendId: userId,
        currency,
      },
      data: {
        amount: 0,
      },
    });
  }
}

export async function deleteExpense(expenseId: string, deletedBy: number) {
  const expense = await db.expense.findUnique({
    where: {
      id: expenseId,
    },
    include: {
      expenseParticipants: true,
    },
  });

  const operations = [];

  if (!expense) {
    throw new Error('Expense not found');
  }

  for (const participant of expense.expenseParticipants) {
    // Update payer's balance towards the participant
    if (participant.userId === expense.paidBy) {
      continue;
    }

    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: expense.paidBy,
            currency: expense.currency,
            friendId: participant.userId,
          },
        },
        create: {
          amount: participant.amount,
          userId: expense.paidBy,
          currency: expense.currency,
          friendId: participant.userId,
        },
        update: {
          amount: {
            decrement: -participant.amount,
          },
        },
      }),
    );

    // Update participant's balance towards the payer
    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency: expense.currency,
            friendId: expense.paidBy,
          },
        },
        create: {
          amount: -participant.amount,
          userId: participant.userId,
          currency: expense.currency,
          friendId: expense.paidBy,
        },
        update: {
          amount: {
            decrement: participant.amount,
          },
        },
      }),
    );

    if (expense.groupId) {
      operations.push(
        db.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: expense.paidBy,
              firendId: participant.userId,
            },
          },
          create: {
            amount: participant.amount,
            groupId: expense.groupId,
            currency: expense.currency,
            userId: expense.paidBy,
            firendId: participant.userId,
          },
          update: {
            amount: {
              decrement: -participant.amount,
            },
          },
        }),
      );

      operations.push(
        db.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: participant.userId,
              firendId: expense.paidBy,
            },
          },
          create: {
            amount: -participant.amount,
            groupId: expense.groupId,
            currency: expense.currency,
            userId: participant.userId,
            firendId: expense.paidBy,
          },
          update: {
            amount: {
              decrement: participant.amount,
            },
          },
        }),
      );
    }
  }

  operations.push(
    db.expense.update({
      where: { id: expenseId },
      data: {
        deletedBy,
        deletedAt: new Date(),
      },
    }),
  );

  await db.$transaction(operations);
  sendExpensePushNotification(expenseId).catch(console.error);
}

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
    },
  });

  if (!expense) {
    return;
  }

  const participants = expense.deletedBy
    ? expense.expenseParticipants.map((p) => p.userId).filter((e) => e !== expense.deletedBy)
    : expense.expenseParticipants.map((p) => p.userId).filter((e) => e !== expense.addedBy);

  const subscriptions = await db.pushNotification.findMany({
    where: {
      userId: {
        in: participants,
      },
    },
  });

  const pushData = expense.deletedBy
    ? {
        title: `${expense.deletedByUser?.name ?? expense.deletedByUser?.email}`,
        message: `Deleted ${expense.name}`,
      }
    : expense.splitType === SplitType.SETTLEMENT
      ? {
          title: `${expense.addedByUser.name ?? expense.addedByUser.email}`,
          message: `${expense.paidByUser.name ?? expense.paidByUser.email} settled up ${expense.currency} ${toFixedNumber(expense.amount)}`,
        }
      : {
          title: `${expense.addedByUser.name ?? expense.addedByUser.email}`,
          message: `${expense.paidByUser.name ?? expense.paidByUser.email} paid  ${expense.currency} ${toFixedNumber(expense.amount)} for ${expense.name}`,
        };

  const pushNotifications = subscriptions.map((s) => pushNotification(s.subscription, pushData));

  await Promise.all(pushNotifications);
}

export async function getCompleteFriendsDetails(userId: number) {
  const balances = await db.balance.findMany({
    where: {
      userId,
    },
    include: {
      friend: true,
    },
  });

  const friends = balances.reduce(
    (acc, balance) => {
      const friendId = balance.friendId;
      if (!acc[friendId]) {
        acc[friendId] = {
          balances: [],
          id: balance.friendId,
          email: balance.friend.email,
          name: balance.friend.name,
        };
      }

      if (balance.amount !== 0) {
        acc[friendId]?.balances.push({
          currency: balance.currency,
          amount:
            balance.amount > 0 ? toFixedNumber(balance.amount) : toFixedNumber(balance.amount),
        });
      }

      return acc;
    },
    {} as Record<
      number,
      {
        id: number;
        email?: string | null;
        name?: string | null;
        balances: { currency: string; amount: number }[];
      }
    >,
  );

  return friends;
}

export async function getCompleteGroupDetails(userId: number) {
  const groups = await db.group.findMany({
    where: {
      groupUsers: {
        some: {
          userId,
        },
      },
    },
    include: {
      groupUsers: true,
      groupBalances: true,
    },
  });

  return groups;
}
