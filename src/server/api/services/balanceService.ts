import { db } from '~/server/db';
import type { User } from '@prisma/client';

/**
 * Balance Service
 *
 * This service provides methods for querying user balances.
 * During the migration phase, it queries both the old Balance/GroupBalance tables
 * AND the new BalanceView, asserting they match.
 */

interface BalanceWithFriend {
  userId: number;
  currency: string;
  friendId: number;
  amount: bigint;
  createdAt: Date;
  updatedAt: Date;
  importedFromSplitwise: boolean;
  friend: User;
  hasMore?: boolean;
}

interface GroupBalanceResult {
  groupId: number;
  currency: string;
  userId: number;
  firendId: number;
  amount: bigint;
  updatedAt: Date;
}

/**
 * Deep comparison of balance arrays
 * Logs differences when found
 */
function assertBalancesMatch(
  old: { userId: number; friendId: number; currency: string; amount: bigint }[],
  view: { userId: number; friendId: number; currency: string; amount: bigint }[],
  context: string,
) {
  if (process.env.NODE_ENV === 'production') {
    return; // Skip assertions in production
  }

  const oldSorted = [...old].sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId - b.userId;
    }
    if (a.friendId !== b.friendId) {
      return a.friendId - b.friendId;
    }
    return a.currency.localeCompare(b.currency);
  });

  const viewSorted = [...view].sort((a, b) => {
    if (a.userId !== b.userId) {
      return a.userId - b.userId;
    }
    if (a.friendId !== b.friendId) {
      return a.friendId - b.friendId;
    }
    return a.currency.localeCompare(b.currency);
  });

  if (oldSorted.length !== viewSorted.length) {
    console.error(`[${context}] Balance count mismatch:`, {
      old: oldSorted.length,
      view: viewSorted.length,
    });
    console.error('Old balances:', oldSorted);
    console.error('View balances:', viewSorted);
    throw new Error(`Balance validation failed: count mismatch in ${context}`);
  }

  for (let i = 0; i < oldSorted.length; i++) {
    const o = oldSorted[i]!;
    const v = viewSorted[i]!;

    if (
      o.userId !== v.userId ||
      o.friendId !== v.friendId ||
      o.currency !== v.currency ||
      o.amount !== v.amount
    ) {
      console.error(`[${context}] Balance mismatch at index ${i}:`, {
        old: o,
        view: v,
      });
      throw new Error(`Balance validation failed: data mismatch in ${context}`);
    }
  }
}

/**
 * Get all balances for a user (friend balances only, no groups)
 */
export async function getUserBalances(userId: number): Promise<BalanceWithFriend[]> {
  const [oldBalances, viewBalances] = await Promise.all([
    db.balance.findMany({
      where: { userId },
      orderBy: { amount: 'desc' },
      include: { friend: true },
    }),
    db.balanceView.findMany({
      where: { userId, groupId: null },
    }),
  ]);

  // Assert they match (excluding friend relation which view doesn't have)
  assertBalancesMatch(
    oldBalances,
    viewBalances.map((v) => ({
      userId: v.userId,
      friendId: v.friendId,
      currency: v.currency,
      amount: v.amount,
    })),
    'getUserBalances',
  );

  return oldBalances;
}

/**
 * Get balances grouped by currency for a user
 */
export async function getCumulatedBalances(userId: number) {
  const [oldCumulated, viewData] = await Promise.all([
    db.balance.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      where: { userId },
    }),
    db.balanceView.findMany({
      where: { userId, groupId: null },
      select: { currency: true, amount: true },
    }),
  ]);

  // Calculate view cumulated
  const viewCumulated = viewData.reduce(
    (acc, curr) => {
      const existing = acc.find((c) => c.currency === curr.currency);
      if (existing) {
        existing._sum.amount = (existing._sum.amount ?? 0n) + curr.amount;
      } else {
        acc.push({ currency: curr.currency, _sum: { amount: curr.amount } });
      }
      return acc;
    },
    [] as { currency: string; _sum: { amount: bigint | null } }[],
  );

  // Assert they match
  if (process.env.NODE_ENV !== 'production') {
    const oldSorted = [...oldCumulated].sort((a, b) => a.currency.localeCompare(b.currency));
    const viewSorted = [...viewCumulated].sort((a, b) => a.currency.localeCompare(b.currency));

    if (oldSorted.length !== viewSorted.length) {
      console.error('Cumulated balance count mismatch:', { old: oldSorted, view: viewSorted });
      throw new Error('Cumulated balance validation failed');
    }

    for (let i = 0; i < oldSorted.length; i++) {
      const o = oldSorted[i]!;
      const v = viewSorted[i]!;
      if (o.currency !== v.currency || o._sum.amount !== v._sum.amount) {
        console.error('Cumulated balance mismatch:', { old: o, view: v });
        throw new Error('Cumulated balance validation failed');
      }
    }
  }

  return oldCumulated;
}

/**
 * Get all friends for a user (distinct friendIds from balances)
 */
export async function getUserFriends(userId: number): Promise<number[]> {
  const [oldFriends, viewFriends] = await Promise.all([
    db.balance.findMany({
      where: { userId },
      select: { friendId: true },
      distinct: ['friendId'],
    }),
    db.balanceView.findMany({
      where: { userId, groupId: null },
      select: { friendId: true },
      distinct: ['friendId'],
    }),
  ]);

  const oldIds = oldFriends.map((f) => f.friendId).sort((a, b) => a - b);
  const viewIds = viewFriends.map((f) => f.friendId).sort((a, b) => a - b);

  // Assert they match
  if (process.env.NODE_ENV !== 'production') {
    if (JSON.stringify(oldIds) !== JSON.stringify(viewIds)) {
      console.error('Friend list mismatch:', { old: oldIds, view: viewIds });
      throw new Error('Friend list validation failed');
    }
  }

  return oldIds;
}

/**
 * Get balances between a user and a specific friend
 */
export async function getBalancesWithFriend(userId: number, friendId: number) {
  const [oldBalances, viewBalances] = await Promise.all([
    db.balance.findMany({
      where: {
        userId,
        friendId,
        amount: { not: 0 },
      },
    }),
    db.balanceView.findMany({
      where: {
        userId,
        friendId,
        groupId: null,
        amount: { not: 0 },
      },
    }),
  ]);

  assertBalancesMatch(oldBalances, viewBalances, 'getBalancesWithFriend');

  return oldBalances;
}

/**
 * Get all group balances for a specific group
 */
export async function getGroupBalances(groupId: number): Promise<GroupBalanceResult[]> {
  const [oldBalances, viewBalances] = await Promise.all([
    db.groupBalance.findMany({
      where: { groupId },
    }),
    db.balanceView.findMany({
      where: { groupId },
    }),
  ]);

  // Assert they match
  assertBalancesMatch(
    oldBalances.map((b) => ({
      userId: b.userId,
      friendId: b.firendId,
      currency: b.currency,
      amount: b.amount,
    })),
    viewBalances.map((v) => ({
      userId: v.userId,
      friendId: v.friendId,
      currency: v.currency,
      amount: v.amount,
    })),
    'getGroupBalances',
  );

  return oldBalances;
}

/**
 * Check if user has any non-zero balances with a friend
 */
export async function hasNonZeroBalanceWithFriend(
  userId: number,
  friendId: number,
): Promise<boolean> {
  const balances = await getBalancesWithFriend(userId, friendId);
  return balances.length > 0;
}
