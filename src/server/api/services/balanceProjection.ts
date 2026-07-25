import { type Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

const getCandidateFriendIds = (userId: number, friendIds: number[]) => [
  ...new Set(friendIds.filter((friendId) => friendId !== userId)),
];

export const captureSettlementAllocations = async (
  tx: TransactionClient,
  settlementExpenseId: string,
  userId: number,
  friendIds: number[],
  currency: string,
) => {
  const candidateFriendIds = getCandidateFriendIds(userId, friendIds);
  if (!candidateFriendIds.length) {
    return;
  }

  const balances = await tx.balance.findMany({
    where: {
      currency,
      OR: [
        { userId, friendId: { in: candidateFriendIds } },
        { userId: { in: candidateFriendIds }, friendId: userId },
      ],
    },
  });
  const balanceAmounts = new Map(
    balances.map((balance) => [`${balance.userId}:${balance.friendId}`, balance.amount]),
  );
  const settledFriendIds = candidateFriendIds.filter(
    (friendId) =>
      0 === balanceAmounts.get(`${userId}:${friendId}`) &&
      0 === balanceAmounts.get(`${friendId}:${userId}`),
  );

  if (!settledFriendIds.length) {
    return;
  }

  const groupBalances = await tx.groupBalance.findMany({
    where: {
      amount: { not: 0 },
      currency,
      OR: [
        { userId, firendId: { in: settledFriendIds } },
        { userId: { in: settledFriendIds }, firendId: userId },
      ],
    },
  });

  if (!groupBalances.length) {
    return;
  }

  await tx.settlementAllocation.createMany({
    data: groupBalances.map((balance) => ({
      settlementExpenseId,
      groupId: balance.groupId,
      currency: balance.currency,
      userId: balance.userId,
      friendId: balance.firendId,
      amount: balance.amount,
    })),
  });

  await Promise.all(
    groupBalances.map((balance) =>
      tx.groupBalance.update({
        where: {
          groupId_currency_firendId_userId: {
            groupId: balance.groupId,
            currency: balance.currency,
            userId: balance.userId,
            firendId: balance.firendId,
          },
        },
        data: { amount: 0 },
      }),
    ),
  );
};

export const restoreSettlementAllocations = async (
  tx: TransactionClient,
  settlementExpenseId: string,
) => {
  const allocations = await tx.settlementAllocation.findMany({
    where: { settlementExpenseId },
  });

  if (!allocations.length) {
    return;
  }

  const requiredMemberships = new Map<string, { groupId: number; userId: number }>();
  allocations.forEach((allocation) => {
    requiredMemberships.set(`${allocation.groupId}:${allocation.userId}`, {
      groupId: allocation.groupId,
      userId: allocation.userId,
    });
    requiredMemberships.set(`${allocation.groupId}:${allocation.friendId}`, {
      groupId: allocation.groupId,
      userId: allocation.friendId,
    });
  });
  const groupUsers = await tx.groupUser.findMany({
    where: { OR: [...requiredMemberships.values()] },
  });
  const currentMemberships = new Set(
    groupUsers.map((groupUser) => `${groupUser.groupId}:${groupUser.userId}`),
  );
  const restorableAllocations = allocations.filter(
    (allocation) =>
      currentMemberships.has(`${allocation.groupId}:${allocation.userId}`) &&
      currentMemberships.has(`${allocation.groupId}:${allocation.friendId}`),
  );

  await Promise.all(
    restorableAllocations.map((allocation) =>
      tx.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId: allocation.groupId,
            currency: allocation.currency,
            userId: allocation.userId,
            firendId: allocation.friendId,
          },
        },
        create: {
          groupId: allocation.groupId,
          currency: allocation.currency,
          userId: allocation.userId,
          firendId: allocation.friendId,
          amount: allocation.amount,
        },
        update: { amount: { increment: allocation.amount } },
      }),
    ),
  );
  await tx.settlementAllocation.deleteMany({ where: { settlementExpenseId } });
};
