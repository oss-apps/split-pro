import { type SplitType, type User } from '@prisma/client';
import { nanoid } from 'nanoid';
import { db } from '~/server/db';
import { type SplitwiseGroup, type SplitwiseUser } from '~/types';
import { toFixedNumber, toInteger } from '~/utils/numbers';
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

export async function editExpense(
  expenseId: string,
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
  for (const participant of expense.expenseParticipants) {
    if (participant.userId === expense.paidBy) {
      continue;
    }

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
  }

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
        expenseDate,
        updatedBy: currentUserId,
      },
    }),
  );

  // Add new balances
  participants.forEach((participant) => {
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
          amount: -toInteger(participant.amount),
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
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
          amount: toInteger(participant.amount),
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
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
            amount: -toInteger(participant.amount),
            groupId: expense.groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
          },
          update: {
            amount: {
              increment: -toInteger(participant.amount),
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
            amount: toInteger(participant.amount),
            groupId: expense.groupId,
            currency,
            userId: participant.userId,
            firendId: paidBy,
          },
          update: {
            amount: {
              increment: toInteger(participant.amount),
            },
          },
        }),
      );
    }
  });

  await db.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    participants.map((p) => p.userId),
    currency,
  );
  sendExpensePushNotification(expenseId).catch(console.error);
  return { id: expenseId }; // Return the updated expense
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
      const amount = toInteger(parseFloat(balance.amount));
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

async function createUsersFromSplitwise(users: Array<SplitwiseUser>) {
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
      name: `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}`,
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
  splitWiseGroups: Array<SplitwiseGroup>,
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

  console.log('userMap', userMap, splitWiseGroups);

  const operations = [];
  console.log('Hello world');

  for (const group of splitWiseGroups) {
    console.log('group', group);
    const dbGroup = await db.group.findUnique({
      where: {
        splitwiseGroupId: group.id.toString(),
      },
    });

    if (dbGroup) {
      continue;
    }

    const groupmembers = group.members.map((member) => ({
      userId: userMap[member.email.toString()]!.id,
    }));

    console.log('groupmembers', groupmembers);

    operations.push(
      db.group.create({
        data: {
          name: group.name,
          splitwiseGroupId: group.id.toString(),
          publicId: nanoid(),
          userId: currentUserId,
          groupUsers: {
            create: groupmembers,
          },
        },
      }),
    );
  }

  await db.$transaction(operations);
}
