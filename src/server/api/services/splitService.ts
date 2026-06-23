import { SplitType, type User } from '@prisma/client';
import { nanoid } from 'nanoid';

import { db } from '~/server/db';
import { type SplitwiseGroup, type SplitwiseUser } from '~/types';

import type { CreateExpense } from '~/types/expense.types';
import { sendExpensePushNotification } from './notificationService';
import { createRecurringExpenseJob } from './scheduleService';
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
    cronExpression,
  }: CreateExpense & { cronExpression?: string },
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

  // Pre-generate UUID and create cron job if recurring (before transaction)
  let expenseId: string | undefined = undefined;
  let jobId: bigint | undefined = undefined;

  if (cronExpression) {
    const [{ gen_random_uuid }] = await db.$queryRaw<[{ gen_random_uuid: string }]>`
      SELECT gen_random_uuid()::text as gen_random_uuid
    `;
    expenseId = gen_random_uuid;

    const [{ schedule }] = await createRecurringExpenseJob(expenseId, cronExpression);
    jobId = schedule;
  }

  const operations = [];

  // Create expense operation
  operations.push(
    db.expense.create({
      data: {
        ...(expenseId && { id: expenseId }),
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
    }),
  );

  // Link recurrence to expense if we created a cron job
  if (expenseId && jobId) {
    operations.push(
      db.expenseRecurrence.create({
        data: {
          expense: {
            connect: { id: expenseId },
          },
          job: {
            connect: { jobid: jobId },
          },
        },
      }),
    );
  }

  try {
    const results = await db.$transaction(operations);
    const createdExpense = results[0] as Awaited<ReturnType<typeof db.expense.create>>;
    if (!createdExpense) {
      throw new Error('Expense creation failed');
    }

    sendExpensePushNotification(createdExpense.id).catch(console.error);
    return createdExpense;
  } catch (error) {
    // If we created a cron job but transaction failed, clean up the cron job
    if (expenseId) {
      await db.$executeRaw`SELECT cron.unschedule(${`expense_recurring_${expenseId}`})`;
    }
    throw error;
  }
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
    cronExpression,
  }: CreateExpense & { cronExpression?: string },
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

  // Determine if this is a template or derived expense
  const templateId = expense.recurrence?.job?.command
    ? extractTemplateExpenseId(expense.recurrence.job.command)
    : null;
  const isTemplate = templateId === expenseId;

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

  // Handle recurrence changes only for template expenses
  if (isTemplate && expense.recurrence?.job) {
    const currentSchedule = expense.recurrence.job.schedule;

    if (cronExpression && cronExpression !== currentSchedule) {
      // Schedule changed - update the cron job
      operations.push(
        db.$executeRaw`SELECT cron.alter_job(${expense.recurrence.job.jobid}, schedule := ${cronExpression})`,
      );
    } else if (!cronExpression) {
      // Recurrence removed - unschedule and delete recurrence record
      operations.push(db.$executeRaw`SELECT cron.unschedule(${expense.recurrence.job.jobname})`);
      operations.push(
        db.expenseRecurrence.delete({
          where: { id: expense.recurrence.id },
        }),
      );
    }
    // If cronExpression === currentSchedule, no action needed
  }
  // For derived expenses, cronExpression is ignored entirely

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

  const friends = viewBalances.reduce<
    Record<
      number,
      {
        id: number;
        email?: string | null;
        name?: string | null;
        balances: { currency: string; amount: bigint }[];
      }
    >
  >((acc, balance) => {
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
  }, {});

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

export async function getFullExportData(userId: number) {
  // All users this user has interacted with
  const allExpenses = await db.expense.findMany({
    where: {
      deletedAt: null,
      expenseParticipants: {
        some: { userId },
      },
    },
    include: {
      expenseParticipants: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      paidByUser: { select: { id: true, name: true, email: true } },
      addedByUser: { select: { id: true, name: true, email: true } },
      group: { select: { id: true, name: true, publicId: true } },
    },
    orderBy: { expenseDate: 'asc' },
  });

  const groups = await db.group.findMany({
    where: { groupUsers: { some: { userId } } },
    include: {
      groupUsers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  // Collect all unique users referenced in expenses
  const userMap = new Map<number, { id: number; name: string | null; email: string | null }>();
  for (const expense of allExpenses) {
    userMap.set(expense.paidByUser.id, expense.paidByUser);
    userMap.set(expense.addedByUser.id, expense.addedByUser);
    for (const p of expense.expenseParticipants) {
      userMap.set(p.user.id, p.user);
    }
  }
  for (const group of groups) {
    for (const gu of group.groupUsers) {
      userMap.set(gu.user.id, gu.user);
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedByUserId: userId,
    users: Array.from(userMap.values()),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      publicId: g.publicId,
      defaultCurrency: g.defaultCurrency,
      createdAt: g.createdAt,
      members: g.groupUsers.map((gu) => ({ userId: gu.userId })),
    })),
    expenses: allExpenses.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      amount: e.amount.toString(),
      currency: e.currency,
      splitType: e.splitType,
      expenseDate: e.expenseDate,
      paidByUserId: e.paidBy,
      addedByUserId: e.addedBy,
      groupId: e.groupId,
      participants: e.expenseParticipants.map((p) => ({
        userId: p.userId,
        amount: p.amount.toString(),
      })),
    })),
  };
}

export async function importSplitProData(
  currentUserId: number,
  data: Awaited<ReturnType<typeof getFullExportData>>,
) {
  // Build mapping from exported userId → existing or new local userId
  const userIdMap = new Map<number, number>();

  for (const exportedUser of data.users) {
    if (exportedUser.id === data.exportedByUserId) {
      userIdMap.set(exportedUser.id, currentUserId);
      continue;
    }

    // Try to find by email first
    if (exportedUser.email) {
      const existing = await db.user.findUnique({ where: { email: exportedUser.email } });
      if (existing) {
        userIdMap.set(exportedUser.id, existing.id);
        continue;
      }
    }

    // For local users (no email), deduplicate by name to avoid duplicates on repeated imports
    const localName = exportedUser.name ?? 'Unknown';
    const existingLocal = await db.user.findFirst({
      where: { name: localName, email: null, accounts: { none: {} } },
    });
    if (existingLocal) {
      userIdMap.set(exportedUser.id, existingLocal.id);
      continue;
    }

    // Create as local (unregistered) user
    const newUser = await db.user.create({
      data: {
        name: localName,
        email: null,
        emailVerified: null,
      },
    });
    userIdMap.set(exportedUser.id, newUser.id);
  }

  // Create groups
  const groupIdMap = new Map<number, number>();
  for (const exportedGroup of data.groups) {
    const existing = await db.group.findUnique({ where: { publicId: exportedGroup.publicId } });
    if (existing) {
      groupIdMap.set(exportedGroup.id, existing.id);
      continue;
    }

    const newGroup = await db.group.create({
      data: {
        name: exportedGroup.name,
        publicId: exportedGroup.publicId,
        defaultCurrency: exportedGroup.defaultCurrency,
        userId: currentUserId,
        groupUsers: {
          create: exportedGroup.members
            .map((m) => ({ userId: userIdMap.get(m.userId) }))
            .filter((m): m is { userId: number } => m.userId !== undefined),
        },
      },
    });
    groupIdMap.set(exportedGroup.id, newGroup.id);
  }

  // Create expenses (or restore missing participants for existing ones)
  let expensesImported = 0;
  for (const exportedExpense of data.expenses) {
    const existing = await db.expense.findUnique({
      where: { id: exportedExpense.id },
      include: { expenseParticipants: { select: { userId: true } } },
    });

    if (existing) {
      // Restore any participants that were deleted after the export
      const existingUserIds = new Set(existing.expenseParticipants.map((p) => p.userId));
      const missingParticipants = exportedExpense.participants
        .map((p) => ({ userId: userIdMap.get(p.userId), amount: BigInt(p.amount) }))
        .filter(
          (p): p is { userId: number; amount: bigint } =>
            p.userId !== undefined && !existingUserIds.has(p.userId),
        );

      if (missingParticipants.length > 0) {
        await db.expenseParticipant.createMany({
          data: missingParticipants.map((p) => ({ ...p, expenseId: exportedExpense.id })),
          skipDuplicates: true,
        });
      }
      continue;
    }

    const paidByUserId = userIdMap.get(exportedExpense.paidByUserId);
    const addedByUserId = userIdMap.get(exportedExpense.addedByUserId);
    if (!paidByUserId || !addedByUserId) {
      continue;
    }

    const groupId = exportedExpense.groupId ? groupIdMap.get(exportedExpense.groupId) : null;

    await db.expense.create({
      data: {
        id: exportedExpense.id,
        name: exportedExpense.name,
        category: exportedExpense.category,
        amount: BigInt(exportedExpense.amount),
        currency: exportedExpense.currency,
        splitType: exportedExpense.splitType,
        expenseDate: new Date(exportedExpense.expenseDate),
        paidBy: paidByUserId,
        addedBy: addedByUserId,
        groupId: groupId ?? null,
        expenseParticipants: {
          create: [
            ...exportedExpense.participants
              .map((p) => ({
                userId: userIdMap.get(p.userId),
                amount: BigInt(p.amount),
              }))
              .filter((p): p is { userId: number; amount: bigint } => p.userId !== undefined)
              .reduce(
                (acc, p) => (acc.has(p.userId) ? acc : acc.set(p.userId, p)),
                new Map<number, { userId: number; amount: bigint }>(),
              )
              .values(),
          ],
        },
      },
    });
    expensesImported++;
  }

  return { usersImported: userIdMap.size, groupsImported: groupIdMap.size, expensesImported };
}

export async function restoreSplitProData(
  currentUserId: number,
  data: Awaited<ReturnType<typeof getFullExportData>>,
) {
  // Delete all expenses the current user is involved in (as payer or participant)
  const userExpenseIds = await db.expense.findMany({
    where: {
      OR: [{ paidBy: currentUserId }, { expenseParticipants: { some: { userId: currentUserId } } }],
      deletedAt: null,
    },
    select: { id: true },
  });
  const expenseIds = userExpenseIds.map((e) => e.id);

  await db.$transaction([
    db.expenseParticipant.deleteMany({ where: { expenseId: { in: expenseIds } } }),
    db.expense.deleteMany({ where: { id: { in: expenseIds } } }),
    // Remove user from all groups, then delete groups they own with no remaining members
    db.groupUser.deleteMany({ where: { userId: currentUserId } }),
  ]);

  // Delete groups created by this user that now have no members
  await db.group.deleteMany({
    where: { userId: currentUserId, groupUsers: { none: {} } },
  });

  // Now import fresh from the backup
  return importSplitProData(currentUserId, data);
}

// Converts a numeric Splitwise expense ID to a deterministic UUID-shaped string
function splitwiseIdToUuid(swId: number): string {
  const hex = swId.toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

interface SplitwiseFriend {
  id: number;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
}

interface SplitwiseExpense {
  id: number;
  description: string;
  cost: string;
  currency_code: string;
  date: string;
  group_id: number | null;
  payment: boolean;
  deleted_at: string | null;
  category?: { name: string } | null;
  repayments: { from: number; to: number; amount: string }[];
}

interface SplitwiseProBackup {
  user: { id: number; email: string; first_name: string; last_name?: string };
  friends: SplitwiseFriend[];
  groups: {
    id: number;
    name: string;
    members: { id: number; first_name?: string; last_name?: string; email?: string | null }[];
  }[];
  expenses: SplitwiseExpense[];
}

export async function importFromSplitwisePro(currentUserId: number, data: SplitwiseProBackup) {
  // Build Splitwise userId → SplitPro userId map
  const userIdMap = new Map<number, number>();
  userIdMap.set(data.user.id, currentUserId);

  // Helper: resolve or create a local user by name
  async function resolveLocalUser(id: number, name: string, email?: string | null) {
    if (userIdMap.has(id)) {
      return;
    }
    if (email) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        userIdMap.set(id, existing.id);
        return;
      }
      const newUser = await db.user.create({ data: { name, email } });
      userIdMap.set(id, newUser.id);
    } else {
      const existing = await db.user.findFirst({
        where: { name, email: null, accounts: { none: {} } },
      });
      if (existing) {
        userIdMap.set(id, existing.id);
        return;
      }
      const newUser = await db.user.create({ data: { name, email: null } });
      userIdMap.set(id, newUser.id);
    }
  }

  for (const friend of data.friends) {
    const name = [friend.first_name, friend.last_name].filter(Boolean).join(' ');
    await resolveLocalUser(friend.id, name, friend.email);
  }

  // Also register all group members so no expense participant is unknown
  for (const swGroup of data.groups) {
    for (const m of swGroup.members) {
      if (userIdMap.has(m.id)) {
        continue;
      }
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown';
      await resolveLocalUser(m.id, name, m.email);
    }
  }

  // Build Splitwise groupId → SplitPro groupId map
  const groupIdMap = new Map<number, number>();
  for (const swGroup of data.groups) {
    if (swGroup.id === 0) {
      continue;
    } // Splitwise uses 0 for "no group"
    const existing = await db.group.findFirst({ where: { name: swGroup.name } });
    if (existing) {
      groupIdMap.set(swGroup.id, existing.id);
    } else {
      const members = swGroup.members
        .map((m) => userIdMap.get(m.id))
        .filter((id): id is number => id !== undefined);
      const newGroup = await db.group.create({
        data: {
          name: swGroup.name,
          publicId: nanoid(),
          userId: currentUserId,
          groupUsers: { create: members.map((userId) => ({ userId })) },
        },
      });
      groupIdMap.set(swGroup.id, newGroup.id);
    }
  }

  // Import expenses
  let expensesImported = 0;
  let expensesSkipped = 0;

  const activeExpenses = data.expenses.filter((e) => !e.deleted_at);

  for (const swExp of activeExpenses) {
    const expenseId = splitwiseIdToUuid(swExp.id);
    const existing = await db.expense.findUnique({ where: { id: expenseId } });
    if (existing) {
      expensesSkipped++;
      continue;
    }

    const toCount = new Map<number, number>();
    for (const r of swExp.repayments) {
      toCount.set(r.to, (toCount.get(r.to) ?? 0) + 1);
    }
    const payerSwId =
      toCount.size > 0 ? [...toCount.entries()].sort((a, b) => b[1] - a[1])[0]![0] : data.user.id;

    const paidByUserId = userIdMap.get(payerSwId);
    if (!paidByUserId) {
      continue;
    }

    // Currencies with no subunits (stored as whole units, not cents)
    const ZERO_DECIMAL_CURRENCIES = new Set([
      'VND',
      'JPY',
      'KRW',
      'IDR',
      'ISK',
      'HUF',
      'TWD',
      'BIF',
      'CLP',
      'GNF',
      'MGA',
      'PYG',
      'RWF',
      'UGX',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ]);
    const multiplier = ZERO_DECIMAL_CURRENCIES.has(swExp.currency_code) ? 1 : 100;

    // Reconstruct participants: payer gets positive, debtors get negative
    const amountCents = Math.round(parseFloat(swExp.cost) * multiplier);
    const debtorAmounts = new Map<number, number>();
    for (const r of swExp.repayments) {
      const debtorId = userIdMap.get(r.from);
      if (debtorId !== undefined) {
        debtorAmounts.set(debtorId, Math.round(parseFloat(r.amount) * multiplier));
      }
    }
    const totalOwed = [...debtorAmounts.values()].reduce((a, b) => a + b, 0);
    const payerShare = amountCents - totalOwed;

    const participants: { userId: number; amount: bigint }[] = [
      { userId: paidByUserId, amount: BigInt(payerShare) },
      ...[...debtorAmounts.entries()].map(([userId, amount]) => ({
        userId,
        amount: BigInt(-amount),
      })),
    ];

    const groupId = swExp.group_id ? groupIdMap.get(swExp.group_id) : null;
    const category = swExp.category?.name?.toLowerCase() ?? DEFAULT_CATEGORY;

    await db.expense.create({
      data: {
        id: expenseId,
        name: swExp.description,
        category,
        amount: BigInt(amountCents),
        currency: swExp.currency_code,
        splitType: swExp.payment ? SplitType.SETTLEMENT : SplitType.EXACT,
        expenseDate: new Date(swExp.date),
        paidBy: paidByUserId,
        addedBy: currentUserId,
        groupId: groupId ?? null,
        expenseParticipants: { create: participants },
      },
    });
    expensesImported++;
  }

  return {
    usersImported: userIdMap.size - 1,
    groupsImported: groupIdMap.size,
    expensesImported,
    expensesSkipped,
  };
}

export async function importUserBalanceFromSplitWise(
  currentUserId: number,
  splitWiseUsers: SplitwiseUser[],
) {
  const operations = [];

  const users = await createUsersFromSplitwise(splitWiseUsers);

  const userMap = users.reduce<Record<string, User>>((acc, user) => {
    if (user.email) {
      acc[user.email] = user;
    }

    return acc;
  }, {});

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

  const userMap = users.reduce<Record<string, User>>((acc, user) => {
    if (user.email) {
      acc[user.email] = user;
    }

    return acc;
  }, {});

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

interface HistoricalBalance {
  userId: number;
  friendId: number;
  groupId: number | null;
  currency: string;
  amount: bigint;
}

export const getHistoricalBalances = async (
  userId: number,
  friendId: number,
  currency: string,
  beforeDate: Date,
) =>
  db.$queryRaw<HistoricalBalance[]>`
        SELECT "userId", "friendId", "groupId", currency, amount
        FROM get_balance_at_date(${beforeDate})
        WHERE "userId" = ${userId} 
          AND "friendId" = ${friendId} 
          AND currency = ${currency}
          AND amount != 0
      `;
