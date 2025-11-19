import { db } from '~/server/db';
import type { BalanceView } from '@prisma/client';

export async function getUserBalances(userId: number) {
  const balances = await db.balanceView.findMany({
    where: { userId },
    orderBy: { amount: 'desc' },
    include: { friend: true },
  });

  return getTotalBalances(balances);
}

export async function getCumulatedBalances(userId: number) {
  const cumulated = await db.balanceView.groupBy({
    by: ['currency'],
    _sum: { amount: true },
    where: { userId },
  });

  return cumulated;
}

export async function getUserFriends(userId: number): Promise<number[]> {
  const friends = await db.balanceView.findMany({
    where: { userId },
    select: { friendId: true },
    distinct: ['friendId'],
  });

  return friends.map((f) => f.friendId);
}

export async function getBalancesWithFriend(userId: number, friendId: number) {
  const viewBalances = await db.balanceView.findMany({
    where: {
      userId,
      friendId,
      amount: { not: 0 },
    },
  });

  return getTotalBalances(viewBalances);
}

export async function getGroupBalances(groupId: number) {
  return db.balanceView.findMany({
    where: { groupId },
  });
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
