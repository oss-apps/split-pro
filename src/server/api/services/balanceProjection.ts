import { Prisma } from '@prisma/client';

export const getSettleGroupBalanceQueries = (
  userId: number,
  friendIds: number[],
  currency: string,
) => {
  const candidateFriendIds = friendIds.filter((friendId) => friendId !== userId);
  if (!candidateFriendIds.length) {
    return [];
  }

  return [
    Prisma.sql`
      UPDATE "GroupBalance" AS "groupBalance"
      SET "amount" = 0, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "groupBalance"."userId" = ${userId}
        AND "groupBalance"."currency" = ${currency}
        AND "groupBalance"."firendId" IN (${Prisma.join(candidateFriendIds)})
        AND EXISTS (
          SELECT 1
          FROM "Balance" AS "balance"
          WHERE "balance"."userId" = ${userId}
            AND "balance"."currency" = ${currency}
            AND "balance"."friendId" = "groupBalance"."firendId"
            AND "balance"."amount" = 0
        )
    `,
    Prisma.sql`
      UPDATE "GroupBalance" AS "groupBalance"
      SET "amount" = 0, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "groupBalance"."firendId" = ${userId}
        AND "groupBalance"."currency" = ${currency}
        AND "groupBalance"."userId" IN (${Prisma.join(candidateFriendIds)})
        AND EXISTS (
          SELECT 1
          FROM "Balance" AS "balance"
          WHERE "balance"."userId" = ${userId}
            AND "balance"."currency" = ${currency}
            AND "balance"."friendId" = "groupBalance"."userId"
            AND "balance"."amount" = 0
        )
    `,
  ];
};
