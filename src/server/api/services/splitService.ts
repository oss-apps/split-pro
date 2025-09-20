import { type User } from '@prisma/client';
import { nanoid } from 'nanoid';

import { db } from '~/server/db';
import { type SplitwiseGroup, type SplitwiseUser } from '~/types';
import { toSafeBigInt } from '~/utils/numbers';

import type { CreateExpense } from '~/types/expense.types';
import { sendExpensePushNotification } from './notificationService';

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

export async function createExpense(
  {
    groupId,
    paidBy,
    name,
    category,
    amount,
    splitType,
    currency,
    participants,
    expenseDate,
    fileKey,
    transactionId,
    otherConversion,
  }: CreateExpense,
  currentUserId: number,
) {
  const operations = [];

  const nonZeroParticipants =
    participants.length > 1 ? participants.filter((p) => 0n !== p.amount) : participants;

  // Create expense operation
  operations.push(
    db.expense.create({
      data: {
        groupId,
        paidBy,
        name,
        category,
        amount,
        splitType,
        currency,
        expenseParticipants: {
          create: nonZeroParticipants,
        },
        fileKey,
        addedBy: currentUserId,
        expenseDate,
        transactionId: transactionId ?? '',
        conversionFrom: otherConversion
          ? {
              connect: {
                id: otherConversion ?? null,
              },
            }
          : undefined,
      },
    }),
  );

  // Update group balances and overall balances operations
  nonZeroParticipants.forEach((participant) => {
    // Update payer's balance towards the participant
    if (participant.userId === paidBy) {
      return;
    }

    if (groupId) {
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
              increment: -participant.amount,
            },
          },
          create: {
            groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
            amount: -participant.amount,
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
              increment: participant.amount,
            },
          },
          create: {
            groupId,
            currency,
            userId: participant.userId,
            firendId: paidBy,
            amount: participant.amount, // Negative because it's the opposite balance
          },
        }),
      );
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
            increment: -participant.amount,
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -participant.amount,
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
            increment: participant.amount,
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: participant.amount, // Negative because it's the opposite balance
        },
      }),
    );
  });

  // Execute all operations in a transaction
  const result = await db.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    nonZeroParticipants.map((p) => p.userId),
    currency,
  );
  if (result[0]) {
    sendExpensePushNotification(result[0].id).catch(console.error);
  }
  return result[0];
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

  if (expense.otherConversion) {
    await deleteExpense(expense.otherConversion, deletedBy);
  }

  expense.expenseParticipants
    .filter(({ userId }) => userId !== expense.paidBy)
    .forEach((participant) => {
      // Update payer's balance towards the participant
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
    });

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

export async function editExpense(
  {
    expenseId,
    paidBy,
    name,
    category,
    amount,
    splitType,
    currency,
    participants,
    expenseDate,
    fileKey,
  }: CreateExpense,
  currentUserId: number,
) {
  if (!expenseId) {
    throw new Error('Expense ID is required for editing');
  }
  const nonZeroParticipants =
    participants.length > 1 ? participants.filter((p) => 0n !== p.amount) : participants;

  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    include: {
      expenseParticipants: true,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const operations = [];

  // First reverse all existing balances
  expense.expenseParticipants
    .filter(({ userId, amount }) => userId !== expense.paidBy && 0n !== amount)
    .forEach((participant) => {
      operations.push(
        db.balance.update({
          where: {
            userId_currency_friendId: {
              userId: expense.paidBy,
              currency: expense.currency,
              friendId: participant.userId,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        }),
      );

      operations.push(
        db.balance.update({
          where: {
            userId_currency_friendId: {
              userId: participant.userId,
              currency: expense.currency,
              friendId: expense.paidBy,
            },
          },
          data: {
            amount: {
              decrement: participant.amount,
            },
          },
        }),
      );

      // Reverse group balances if it's a group expense
      if (expense.groupId) {
        operations.push(
          db.groupBalance.update({
            where: {
              groupId_currency_firendId_userId: {
                groupId: expense.groupId,
                currency: expense.currency,
                userId: expense.paidBy,
                firendId: participant.userId,
              },
            },
            data: {
              amount: {
                increment: participant.amount,
              },
            },
          }),
        );

        operations.push(
          db.groupBalance.update({
            where: {
              groupId_currency_firendId_userId: {
                groupId: expense.groupId,
                currency: expense.currency,
                userId: participant.userId,
                firendId: expense.paidBy,
              },
            },
            data: {
              amount: {
                decrement: participant.amount,
              },
            },
          }),
        );
      }
    });

  // Delete existing participants
  operations.push(
    db.expenseParticipant.deleteMany({
      where: {
        expenseId,
      },
    }),
  );

  // Update expense with new details and create new participants
  operations.push(
    db.expense.update({
      where: { id: expenseId },
      data: {
        paidBy,
        name,
        category,
        amount,
        splitType,
        currency,
        expenseParticipants: {
          create: participants,
        },
        fileKey,
        expenseDate,
        updatedBy: currentUserId,
      },
    }),
  );

  // Add new balances
  nonZeroParticipants.forEach((participant) => {
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
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -participant.amount,
        },
        update: {
          amount: {
            increment: -participant.amount,
          },
        },
      }),
    );

    operations.push(
      db.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency,
            friendId: paidBy,
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: participant.amount,
        },
        update: {
          amount: {
            increment: participant.amount,
          },
        },
      }),
    );

    // Add new group balances if it's a group expense
    if (expense.groupId) {
      operations.push(
        db.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency,
              userId: paidBy,
              firendId: participant.userId,
            },
          },
          create: {
            amount: -participant.amount,
            groupId: expense.groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
          },
          update: {
            amount: {
              increment: -participant.amount,
            },
          },
        }),
      );

      operations.push(
        db.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency,
              userId: participant.userId,
              firendId: paidBy,
            },
          },
          create: {
            amount: participant.amount,
            groupId: expense.groupId,
            currency,
            userId: participant.userId,
            firendId: paidBy,
          },
          update: {
            amount: {
              increment: participant.amount,
            },
          },
        }),
      );
    }
  });

  await db.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    nonZeroParticipants.map((p) => p.userId),
    currency,
  );
  sendExpensePushNotification(expenseId).catch(console.error);
  return { id: expenseId }; // Return the updated expense
}

async function updateGroupExpenseForIfBalanceIsZero(
  userId: number,
  friendIds: number[],
  currency: string,
) {
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

  if (balances.length) {
    const friendIds = balances.map((b) => b.friendId);
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
      const { friendId } = balance;
      acc[friendId] ??= {
        balances: [],
        id: friendId,
        email: balance.friend.email,
        name: balance.friend.name,
      };

      if (0n !== balance.amount) {
        acc[friendId]?.balances.push({
          currency: balance.currency,
          amount: balance.amount,
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
        balances: { currency: string; amount: bigint }[];
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

export async function recalculateGroupBalances(groupId: number) {
  const groupExpenses = await db.expense.findMany({
    where: {
      groupId,
      deletedAt: null,
    },
    include: {
      expenseParticipants: true,
    },
  });

  const operations = [];

  operations.push(
    db.groupBalance.updateMany({
      where: {
        groupId,
      },
      data: {
        amount: 0,
      },
    }),
  );

  for (const groupExpense of groupExpenses) {
    for (const participant of groupExpense.expenseParticipants) {
      if (participant.userId === groupExpense.paidBy) {
        continue;
      }

      operations.push(
        db.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId,
              currency: groupExpense.currency,
              userId: groupExpense.paidBy,
              firendId: participant.userId,
            },
          },
          data: {
            amount: {
              increment: -participant.amount,
            },
          },
        }),
        db.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId,
              currency: groupExpense.currency,
              userId: participant.userId,
              firendId: groupExpense.paidBy,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        }),
      );
    }
  }

  await db.$transaction(operations);
}

export async function importUserBalanceFromSplitWise(
  currentUserId: number,
  splitWiseUsers: SplitwiseUser[],
) {
  const operations = [];

  const users = await createUsersFromSplitwise(splitWiseUsers);

  const userMap = users.reduce(
    (acc, user) => {
      if (user.email) {
        acc[user.email] = user;
      }

      return acc;
    },
    {} as Record<string, User>,
  );

  for (const user of splitWiseUsers) {
    const dbUser = userMap[user.email];
    if (!dbUser) {
      continue;
    }

    for (const balance of user.balance) {
      const amount = toSafeBigInt(balance.amount);
      const currency = balance.currency_code;
      const existingBalance = await db.balance.findUnique({
        where: {
          userId_currency_friendId: {
            userId: currentUserId,
            currency,
            friendId: dbUser.id,
          },
        },
      });

      if (existingBalance?.importedFromSplitwise) {
        continue;
      }

      operations.push(
        db.balance.upsert({
          where: {
            userId_currency_friendId: {
              userId: currentUserId,
              currency,
              friendId: dbUser.id,
            },
          },
          update: {
            amount: {
              increment: amount,
            },
            importedFromSplitwise: true,
          },
          create: {
            userId: currentUserId,
            currency,
            friendId: dbUser.id,
            amount,
            importedFromSplitwise: true,
          },
        }),
      );

      operations.push(
        db.balance.upsert({
          where: {
            userId_currency_friendId: {
              userId: dbUser.id,
              currency,
              friendId: currentUserId,
            },
          },
          update: {
            amount: {
              increment: -amount,
            },
            importedFromSplitwise: true,
          },
          create: {
            userId: dbUser.id,
            currency,
            friendId: currentUserId,
            amount: -amount,
            importedFromSplitwise: true,
          },
        }),
      );
    }
  }

  await db.$transaction(operations);
}

async function createUsersFromSplitwise(users: SplitwiseUser[]) {
  const userEmails = users.map((u) => u.email);

  const existingUsers = await db.user.findMany({
    where: {
      email: {
        in: userEmails,
      },
    },
  });

  const existingUserMap: Record<string, boolean> = {};

  for (const user of existingUsers) {
    if (user.email) {
      existingUserMap[user.email] = true;
    }
  }

  const newUsers = users.filter((u) => !existingUserMap[u.email]);

  await db.user.createMany({
    data: newUsers.map((u) => ({
      email: u.email,
      name: `${u.first_name}${u.last_name ? ` ${u.last_name}` : ''}`,
    })),
  });

  return db.user.findMany({
    where: {
      email: {
        in: userEmails,
      },
    },
  });
}

export async function importGroupFromSplitwise(
  currentUserId: number,
  splitWiseGroups: SplitwiseGroup[],
) {
  const splitwiseUserMap: Record<string, SplitwiseUser> = {};

  for (const group of splitWiseGroups) {
    for (const member of group.members) {
      splitwiseUserMap[member.id.toString()] = member;
    }
  }

  const users = await createUsersFromSplitwise(Object.values(splitwiseUserMap));

  const userMap = users.reduce(
    (acc, user) => {
      if (user.email) {
        acc[user.email] = user;
      }

      return acc;
    },
    {} as Record<string, User>,
  );

  const missingGroups = await Promise.all(
    splitWiseGroups.map(async (group) => {
      const dbGroup = await db.group.findUnique({
        where: {
          splitwiseGroupId: group.id.toString(),
        },
      });

      return dbGroup ? null : group;
    }),
  );

  const operations = missingGroups
    .filter((g) => null !== g)
    .map((group) => {
      const groupmembers = group.members.map((member) => ({
        userId: userMap[member.email.toString()]!.id,
      }));

      return db.group.create({
        data: {
          name: group.name,
          splitwiseGroupId: group.id.toString(),
          publicId: nanoid(),
          userId: currentUserId,
          groupUsers: {
            create: groupmembers,
          },
        },
      });
    });

  await db.$transaction(operations);
}
