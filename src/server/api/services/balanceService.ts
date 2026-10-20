import { type BalanceView, type Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { simplifyDebts } from '~/lib/simplify';

export const balanceDateRangeSchema = z.object({
  fromDate: z.date().optional(),
  toDateExclusive: z.date().optional(),
});
type BalanceDateRange = z.infer<typeof balanceDateRangeSchema>;
type BalanceScope = Pick<
  Prisma.BalanceEntryViewWhereInput,
  'userId' | 'friendId' | 'groupId' | 'currency'
>;
type BalanceClient = Pick<Prisma.TransactionClient, 'balanceEntryView' | 'group'>;

export const getBalanceDateRange = (
  defaultToDateExclusive: Date,
  input?: BalanceDateRange,
): BalanceDateRange => {
  const toDateExclusive = input?.toDateExclusive ?? defaultToDateExclusive;
  if (input?.fromDate && input.fromDate >= toDateExclusive) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'fromDate must precede toDateExclusive' });
  }
  return { fromDate: input?.fromDate, toDateExclusive };
};

/** No date bounds means all history, including future-dated obligations. */
export const getBalances = async (
  client: Pick<BalanceClient, 'balanceEntryView'>,
  { where, fromDate, toDateExclusive }: BalanceDateRange & { where?: BalanceScope } = {},
): Promise<BalanceView[]> => {
  const rows = await client.balanceEntryView.groupBy({
    by: ['userId', 'friendId', 'groupId', 'currency'],
    where: {
      ...where,
      expenseDate: { gte: fromDate, lt: toDateExclusive },
    },
    _sum: { amount: true },
    _min: { createdAt: true },
    _max: { updatedAt: true },
  });
  return rows.map(({ userId, friendId, groupId, currency, _sum: sum, _min: min, _max: max }) => ({
    userId,
    friendId,
    groupId,
    currency,
    amount: sum.amount ?? 0n,
    // Every group has a contribution with non-null timestamps.
    createdAt: min.createdAt!,
    updatedAt: max.updatedAt!,
  }));
};

/** Batch full group graphs before simplification, then select the viewer's rows. */
export const getUserBalances = async (
  client: BalanceClient,
  userId: number,
  range: BalanceDateRange,
) => {
  const raw = await getBalances(client, { ...range, where: { userId } });
  const groupIds = [...new Set(raw.flatMap((row) => (null === row.groupId ? [] : [row.groupId])))];
  const groups =
    0 === groupIds.length
      ? []
      : await client.group.findMany({
          where: { id: { in: groupIds } },
          select: { id: true, name: true, simplifyDebts: true },
        });
  const simplifiedIds = groups.filter((group) => group.simplifyDebts).map((group) => group.id);
  const graphs =
    0 === simplifiedIds.length
      ? []
      : await getBalances(client, {
          ...range,
          where: { groupId: { in: simplifiedIds } },
        });
  const processed = [
    ...raw.filter((row) => null === row.groupId || !simplifiedIds.includes(row.groupId)),
    ...simplifiedIds.flatMap((groupId) =>
      simplifyDebts(graphs.filter((row) => row.groupId === groupId)).filter(
        (row) => row.userId === userId,
      ),
    ),
  ];
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  return processed.map((row) =>
    Object.assign(row, {
      group: null === row.groupId ? null : (groupMap.get(row.groupId) ?? null),
    }),
  );
};
