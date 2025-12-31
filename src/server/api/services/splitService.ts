import { SplitType, type User } from '@prisma/client';
import { nanoid } from 'nanoid';

import { db } from '~/server/db';
import { type SplitwiseGroup, type SplitwiseUser } from '~/types';

import type { CreateExpense } from '~/types/expense.types';
import { sendExpensePushNotification } from './notificationService';
import { getCurrencyHelpers } from '~/utils/numbers';
import { isCurrencyCode } from '~/lib/currency';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { extractTemplateExpenseId } from '~/lib/cron';

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
  }: CreateExpense,
  currentUserId: number,
  conversionFromParams?: CreateExpense,
) {
  const nonZeroParticipants = getNonZeroParticipants(participants);

  const conversionFrom = conversionFromParams
    ? {
        create: {
          ...conversionFromParams,
          addedBy: currentUserId,
          expenseParticipants: {
            create: getNonZeroParticipants(conversionFromParams.participants),
          },
        },
      }
    : undefined;
  if (conversionFrom) {
    // @ts-ignore
    delete conversionFrom.create.participants;
  }

  // Create expense operation
  const result = await db.expense.create({
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
      transactionId,
      conversionFrom,
    },
  });
  if (result) {
    sendExpensePushNotification(result.id).catch(console.error);
  }
  return result;
}

export async function deleteExpense(expenseId: string, deletedBy: number) {
  const expense = await db.expense.findUnique({
    where: {
      id: expenseId,
    },
    include: {
      recurrence: {
        include: {
          job: true,
        },
      },
    },
  });

  const operations = [];

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.conversionToId) {
    await deleteExpense(expense.conversionToId, deletedBy);
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

  if (expense.recurrence?.job) {
    const templateId = extractTemplateExpenseId(expense.recurrence.job.command);
    const isTemplate = templateId === expense.id;

    if (isTemplate) {
      // Template deletion stops the recurrence
      operations.push(db.$executeRaw`SELECT cron.unschedule(${expense.recurrence.job.jobname})`);
      operations.push(
        db.expenseRecurrence.delete({
          where: { id: expense.recurrence.id },
        }),
      );
    }
    // Derived expense deletion: just soft-delete, recurrence continues
  }

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
    transactionId,
  }: CreateExpense,
  currentUserId: number,
  conversionToParams?: CreateExpense,
) {
  if (!expenseId) {
    throw new Error('Expense ID is required for editing');
  }

  const expense = await db.expense.findUnique({
    where: { id: expenseId },
    include: {
      expenseParticipants: true,
      recurrence: {
        include: {
          job: true,
        },
      },
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const operations = [];

  // Delete existing participants
  operations.push(
    db.expenseParticipant.deleteMany({
      where: {
        expenseId: expense.conversionToId ? { in: [expenseId, expense.conversionToId] } : expenseId,
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
        transactionId,
        expenseDate,
        updatedBy: currentUserId,
      },
    }),
  );
  if (conversionToParams) {
    if (!expense.conversionToId) {
      throw new Error('Conversion to expense not found for editing');
    }
    const { participants: toParticipants, ...toExpenseData } = conversionToParams;

    operations.push(
      db.expense.update({
        where: { id: expense.conversionToId },
        data: {
          ...toExpenseData,
          expenseParticipants: {
            create: toParticipants,
          },
          updatedBy: currentUserId,
        },
      }),
    );
  }

  if (expense.recurrence?.job) {
    operations.push(db.$executeRaw`SELECT cron.unschedule(${expense.recurrence.job.jobname})`);
  }
  await db.$transaction(operations);
  sendExpensePushNotification(expenseId).catch(console.error);
  return { id: expenseId }; // Return the updated expense
}

export async function getCompleteFriendsDetails(userId: number) {
  const viewBalances = await db.balanceView.findMany({
    where: {
      userId,
    },
    include: {
      friend: true,
    },
  });

  const friends = viewBalances.reduce(
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

  const currencyHelperCache: Record<string, ReturnType<typeof getCurrencyHelpers>['toSafeBigInt']> =
    {};

  for (const user of splitWiseUsers) {
    const dbUser = userMap[user.email];
    if (!dbUser) {
      // oxlint-disable-next-line no-continue
      continue;
    }

    for (const balance of user.balance) {
      const currency = balance.currency_code;

      if (!currencyHelperCache[currency]) {
        currencyHelperCache[currency] = getCurrencyHelpers({
          currency: isCurrencyCode(currency) ? currency : 'USD',
        }).toSafeBigInt;
      }

      const amount = currencyHelperCache[currency](balance.amount);

      operations.push(
        db.expense.create({
          data: {
            name: 'Splitwise Balance Import',
            amount,
            currency,
            paidBy: currentUserId,
            splitType: SplitType.EQUAL,
            expenseParticipants: {
              create: [
                {
                  userId: currentUserId,
                  amount: amount,
                },
                {
                  userId: dbUser.id,
                  amount: -amount,
                },
              ],
            },
            addedBy: currentUserId,
            category: DEFAULT_CATEGORY,
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

const getNonZeroParticipants = (participants: { userId: number; amount: bigint }[]) =>
  participants.length > 1 ? participants.filter((p) => 0n !== p.amount) : participants;
