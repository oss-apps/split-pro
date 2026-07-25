import { SplitType, type Expense, type Prisma, type User } from '@prisma/client';
import { nanoid } from 'nanoid';
import { db } from '~/server/db';
import { type SplitwiseGroup, type SplitwiseUser } from '~/types';
import { toFixedNumber, toInteger } from '~/utils/numbers';
import { toBalancedParticipants } from '~/utils/splits';
import { captureSettlementAllocations, restoreSettlementAllocations } from './balanceProjection';
import { runBalanceTransaction } from './balanceTransaction';
import { sendExpensePushNotification } from './notificationService';

type StoredParticipant = { userId: number; amount: number };

const SETTLEMENT_ALLOCATION_VERSION = 1;

const updatePersonalBalances = async (
  tx: Prisma.TransactionClient,
  paidBy: number,
  currency: string,
  participants: StoredParticipant[],
  direction: 1 | -1,
) => {
  const otherParticipants = participants
    .filter((participant) => participant.userId !== paidBy)
    .sort((a, b) => a.userId - b.userId);

  await Promise.all(
    otherParticipants.flatMap((participant) => {
      const payerAmount = -participant.amount * direction;
      const participantAmount = participant.amount * direction;

      return [
        tx.balance.upsert({
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
            amount: payerAmount,
          },
          update: { amount: { increment: payerAmount } },
        }),
        tx.balance.upsert({
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
            amount: participantAmount,
          },
          update: { amount: { increment: participantAmount } },
        }),
      ];
    }),
  );
};

const assertSettlementCanBeChanged = (expense: {
  groupId: number | null;
  settlementAllocationVersion: number | null;
  splitType: SplitType;
}) => {
  if (
    null === expense.groupId &&
    SplitType.SETTLEMENT === expense.splitType &&
    SETTLEMENT_ALLOCATION_VERSION !== expense.settlementAllocationVersion
  ) {
    throw new Error('Legacy settlements cannot be edited or deleted safely');
  }
};

const toStoredParticipants = (participants: { userId: number; amount: number }[]) =>
  participants.map((participant) => ({
    userId: participant.userId,
    amount: toInteger(participant.amount),
  }));

const hasSameFinancialEffect = (
  expense: {
    amount: number;
    currency: string;
    paidBy: number;
    splitType: SplitType;
    expenseParticipants: StoredParticipant[];
  },
  amount: number,
  currency: string,
  paidBy: number,
  splitType: SplitType,
  participants: StoredParticipant[],
) => {
  if (
    expense.amount !== toInteger(amount) ||
    expense.currency !== currency ||
    expense.paidBy !== paidBy ||
    expense.splitType !== splitType ||
    expense.expenseParticipants.length !== participants.length
  ) {
    return false;
  }

  const oldAmounts = new Map(
    expense.expenseParticipants.map((participant) => [participant.userId, participant.amount]),
  );
  return participants.every(
    (participant) => oldAmounts.get(participant.userId) === participant.amount,
  );
};

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

const createPersonalExpense = async ({
  paidBy,
  name,
  category,
  amount,
  splitType,
  currency,
  participants,
  currentUserId,
  expenseDate,
  fileKey,
}: {
  paidBy: number;
  name: string;
  category: string;
  amount: number;
  splitType: SplitType;
  currency: string;
  participants: { userId: number; amount: number }[];
  currentUserId: number;
  expenseDate: Date;
  fileKey?: string;
}) => {
  const storedParticipants = toStoredParticipants(participants);

  return runBalanceTransaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        paidBy,
        name,
        category,
        amount: toInteger(amount),
        splitType,
        currency,
        expenseParticipants: { create: storedParticipants },
        fileKey,
        addedBy: currentUserId,
        expenseDate,
        settlementAllocationVersion:
          SplitType.SETTLEMENT === splitType ? SETTLEMENT_ALLOCATION_VERSION : null,
      },
    });

    await updatePersonalBalances(tx, paidBy, currency, storedParticipants, 1);

    if (SplitType.SETTLEMENT === splitType) {
      await captureSettlementAllocations(
        tx,
        expense.id,
        paidBy,
        storedParticipants.map((participant) => participant.userId),
        currency,
      );
    }

    return expense;
  });
};

const editPersonalExpense = async ({
  expenseId,
  paidBy,
  name,
  category,
  amount,
  splitType,
  currency,
  participants,
  currentUserId,
  expenseDate,
  fileKey,
}: {
  expenseId: string;
  paidBy: number;
  name: string;
  category: string;
  amount: number;
  splitType: SplitType;
  currency: string;
  participants: { userId: number; amount: number }[];
  currentUserId: number;
  expenseDate: Date;
  fileKey?: string;
}) => {
  const storedParticipants = toStoredParticipants(participants);

  return runBalanceTransaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { expenseParticipants: true },
    });

    if (!expense) {
      throw new Error('Expense not found');
    }
    if (expense.deletedAt) {
      throw new Error('Deleted expenses cannot be edited');
    }

    assertSettlementCanBeChanged(expense);

    if (hasSameFinancialEffect(expense, amount, currency, paidBy, splitType, storedParticipants)) {
      await tx.expense.update({
        where: { id: expenseId },
        data: { name, category, fileKey, expenseDate, updatedBy: currentUserId },
      });
      return { id: expenseId };
    }

    await restoreSettlementAllocations(tx, expenseId);
    await updatePersonalBalances(
      tx,
      expense.paidBy,
      expense.currency,
      expense.expenseParticipants,
      -1,
    );
    await tx.expenseParticipant.deleteMany({ where: { expenseId } });
    await tx.expense.update({
      where: { id: expenseId },
      data: {
        paidBy,
        name,
        category,
        amount: toInteger(amount),
        splitType,
        currency,
        expenseParticipants: { create: storedParticipants },
        fileKey,
        expenseDate,
        updatedBy: currentUserId,
        settlementAllocationVersion:
          SplitType.SETTLEMENT === splitType ? SETTLEMENT_ALLOCATION_VERSION : null,
      },
    });
    await updatePersonalBalances(tx, paidBy, currency, storedParticipants, 1);

    if (SplitType.SETTLEMENT === splitType) {
      await captureSettlementAllocations(
        tx,
        expenseId,
        paidBy,
        storedParticipants.map((participant) => participant.userId),
        currency,
      );
    }

    return { id: expenseId };
  });
};

const deletePersonalExpense = async (expenseId: string, deletedBy: number) =>
  runBalanceTransaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { expenseParticipants: true },
    });

    if (!expense) {
      throw new Error('Expense not found');
    }
    if (expense.deletedAt) {
      throw new Error('Expense is already deleted');
    }

    assertSettlementCanBeChanged(expense);
    await restoreSettlementAllocations(tx, expenseId);
    await updatePersonalBalances(
      tx,
      expense.paidBy,
      expense.currency,
      expense.expenseParticipants,
      -1,
    );
    await tx.expense.update({
      where: { id: expenseId },
      data: { deletedBy, deletedAt: new Date() },
    });
  });

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
  const modifiedAmount = toInteger(amount);
  participants = toBalancedParticipants(amount, paidBy, participants);
  const expense = await runBalanceTransaction(async (tx) => {
    const participantIds = participants.map((participant) => participant.userId);
    const memberCount = await tx.groupUser.count({
      where: { groupId, userId: { in: participantIds } },
    });

    if (memberCount !== new Set(participantIds).size) {
      throw new Error('All expense participants must be current group members');
    }

    const operations = [];

    // Create expense operation
    operations.push(
      tx.expense.create({
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
        tx.groupBalance.upsert({
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
        tx.groupBalance.upsert({
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
        tx.balance.upsert({
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
        tx.balance.upsert({
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

    const result = await Promise.all(operations);
    return result[0] as Expense | undefined;
  });

  if (expense) {
    sendExpensePushNotification(expense.id).catch(console.error);
  }
  return expense;
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
  participants = toBalancedParticipants(amount, paidBy, participants);
  const expense = await createPersonalExpense({
    paidBy,
    name,
    category,
    amount,
    splitType,
    currency,
    participants,
    currentUserId,
    expenseDate,
    fileKey,
  });

  sendExpensePushNotification(expense.id).catch(console.error);
  return expense;
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

  if (null === expense.groupId) {
    await deletePersonalExpense(expenseId, deletedBy);
    sendExpensePushNotification(expenseId).catch(console.error);
    return;
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

  participants = toBalancedParticipants(amount, paidBy, participants);

  if (null === expense.groupId) {
    const result = await editPersonalExpense({
      expenseId,
      paidBy,
      name,
      category,
      amount,
      splitType,
      currency,
      participants,
      currentUserId,
      expenseDate,
      fileKey,
    });
    sendExpensePushNotification(expenseId).catch(console.error);
    return result;
  }

  const result = await runBalanceTransaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { expenseParticipants: true },
    });

    if (!expense || null === expense.groupId) {
      throw new Error('Group expense not found');
    }
    if (expense.deletedAt) {
      throw new Error('Deleted expenses cannot be edited');
    }

    const participantIds = participants.map((participant) => participant.userId);
    const memberCount = await tx.groupUser.count({
      where: { groupId: expense.groupId, userId: { in: participantIds } },
    });

    if (memberCount !== new Set(participantIds).size) {
      throw new Error('All expense participants must be current group members');
    }

    const operations = [];

    // First reverse all existing balances
    for (const participant of expense.expenseParticipants) {
      if (participant.userId === expense.paidBy) {
        continue;
      }

      operations.push(
        tx.balance.update({
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
        tx.balance.update({
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
          tx.groupBalance.update({
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
          tx.groupBalance.update({
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
      tx.expenseParticipant.deleteMany({
        where: {
          expenseId,
        },
      }),
    );

    // Update expense with new details and create new participants
    operations.push(
      tx.expense.update({
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
        tx.balance.upsert({
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
        tx.balance.upsert({
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
          tx.groupBalance.upsert({
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
          tx.groupBalance.upsert({
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

    await Promise.all(operations);
    return { id: expenseId };
  });

  sendExpensePushNotification(expenseId).catch(console.error);
  return result;
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
