import { db } from '~/server/db';
import type { Balance, BalanceView, GroupBalance } from '@prisma/client';

export class BalanceError extends Error {
  constructor(context: string) {
    super(
      `Balance validation failed: ${context}, please report this on GitHub 1.6-alpha discussion.`,
    );
  }
}

/**
 * Deep comparison of balance arrays
 * Logs differences when found
 */
function _assertBalancesMatch(
  oldRaw: (Balance | GroupBalance)[],
  viewRaw: BalanceView[],
  context: string,
) {
  const old = oldRaw
    .filter((b) => b.amount !== 0n)
    .map((b) => ({
      userId: b.userId,
      // @ts-ignore
      friendId: b.friendId ?? b.firendId,
      currency: b.currency,
      amount: b.amount,
    }));
  const view = viewRaw
    .filter((b) => b.amount !== 0n)
    .map((b) => ({
      userId: b.userId,
      friendId: b.friendId,
      currency: b.currency,
      groupId: b.groupId,
      amount: b.amount,
    }));

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
    const longer = oldSorted.length > viewSorted.length ? oldSorted : viewSorted;
    const shorter = oldSorted.length > viewSorted.length ? viewSorted : oldSorted;

    let l = 0;
    let r = 0;
    while (l < longer.length && r < shorter.length) {
      const lo = longer[l]!;
      const so = shorter[r]!;

      if (
        lo.friendId !== so.friendId ||
        lo.userId !== so.userId ||
        lo.currency !== so.currency ||
        lo.amount !== so.amount
      ) {
        console.error(`[${context}] Extra balance entry:`, lo);
        l++;
      } else {
        l++;
        r++;
      }
    }
    while (l < longer.length) {
      console.error(`[${context}] Extra balance entry:`, longer[l]!);
      l++;
    }
    throw new BalanceError(context);
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
      throw new BalanceError(context);
    }
  }
}

export function assertBalancesMatch(
  oldRaw: (Balance | GroupBalance)[],
  viewRaw: BalanceView[],
  context: string,
) {
  try {
    _assertBalancesMatch(oldRaw, viewRaw, context);
  } catch (error) {
    if (error instanceof BalanceError) {
      console.error(error.message);
    } else {
      throw error;
    }
  }

  return oldRaw;
}

export async function getUserBalances(userId: number) {
  const [oldBalances, viewBalances] = await Promise.all([
    db.balance.findMany({
      where: { userId },
      orderBy: { amount: 'desc' },
      include: { friend: true },
    }),
    db.balanceView.findMany({
      where: { userId },
      orderBy: { amount: 'desc' },
      include: { friend: true },
    }),
  ]);

  const groupAggregatedViewBalances = getTotalBalances(viewBalances);

  return assertBalancesMatch(
    oldBalances,
    groupAggregatedViewBalances,
    'getUserBalances',
  ) as typeof oldBalances;
}

export async function getCumulatedBalances(userId: number) {
  const [oldCumulated, viewCumulated] = await Promise.all([
    db.balance.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      where: { userId },
    }),
    db.balanceView.groupBy({
      by: ['currency'],
      _sum: { amount: true },
      where: { userId },
    }),
  ]);

  try {
    const oldSorted = [...oldCumulated]
      .sort((a, b) => a.currency.localeCompare(b.currency))
      .map((b) => ({ ...b, _sum: b._sum.amount }))
      .filter((b) => b._sum !== 0n);
    const viewSorted = [...viewCumulated]
      .sort((a, b) => a.currency.localeCompare(b.currency))
      .map((b) => ({ ...b, _sum: b._sum.amount }))
      .filter((b) => b._sum !== 0n);

    if (oldSorted.length !== viewSorted.length) {
      console.error('Cumulated balance count mismatch:', { old: oldSorted, view: viewSorted });
      throw new BalanceError('getCumulatedBalances');
    }

    for (let i = 0; i < oldSorted.length; i++) {
      const o = oldSorted[i]!;
      const v = viewSorted[i]!;
      if (o.currency !== v.currency || o._sum !== v._sum) {
        console.error('Cumulated balance mismatch:', { old: o, view: v });
        throw new BalanceError('getCumulatedBalances');
      }
    }
  } catch (error) {
    if (error instanceof BalanceError) {
      console.error(error.message);
    } else {
      throw error;
    }
  }

  return oldCumulated;
}

export async function getUserFriends(userId: number): Promise<number[]> {
  const [oldFriends, viewFriends] = await Promise.all([
    db.balance.findMany({
      where: { userId },
      select: { friendId: true },
      distinct: ['friendId'],
    }),
    db.balanceView.findMany({
      where: { userId },
      select: { friendId: true },
      distinct: ['friendId'],
    }),
  ]);

  const oldIds = oldFriends.map((f) => f.friendId).sort((a, b) => a - b);
  // oxlint-disable-next-line no-unused-vars This fails due to a bug in balances themselves
  const viewIds = viewFriends.map((f) => f.friendId).sort((a, b) => a - b);

  return oldIds;
}

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
        amount: { not: 0 },
      },
    }),
  ]);

  const groupAggregatedViewBalances = getTotalBalances(viewBalances);

  return assertBalancesMatch(
    oldBalances,
    groupAggregatedViewBalances,
    'getBalancesWithFriend',
  ) as Balance[];
}

export async function getGroupBalances(groupId: number) {
  const [oldBalances, viewBalances] = await Promise.all([
    db.groupBalance.findMany({
      where: { groupId },
    }),
    db.balanceView.findMany({
      where: { groupId },
    }),
  ]);

  return assertBalancesMatch(oldBalances, viewBalances, 'getGroupBalances') as GroupBalance[];
}

/**
 * @deprecated This makeshift logic will be removed when we discard total balances in favor of split ones.
 */
export function getTotalBalances<B extends BalanceView>(balances: B[]): B[] {
  return Object.values(
    balances!.reduce((acc, balance) => {
      const key = `${balance.friendId}-${balance.currency}`;

      if (!acc[key]) {
        acc[key] = {
          ...balance,
          amount: 0n,
        };
      }

      acc[key].amount += balance.amount;

      return acc;
    }, {} as any),
  ).sort((a: any, b: any) => (b.amount > a.amount ? 1 : -1)) as any;
}
