import { type Prisma, type PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const balanceDateRangeSchema = z.object({
  fromDate: z.date().optional(),
  toDateExclusive: z.date().optional(),
});

/** Scope the existing balance view (including Prisma relations) to one date range.
 * SET LOCAL is isolated to this transaction and cleared on commit or rollback.
 * Unscoped queries deliberately retain all history for mutation guards.
 */
export const withBalanceDateRange = async <T>(
  client: PrismaClient,
  defaultToDateExclusive: Date,
  input: z.infer<typeof balanceDateRangeSchema> | undefined,
  query: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  const toDateExclusive = input?.toDateExclusive ?? defaultToDateExclusive;
  if (input?.fromDate && input.fromDate >= toDateExclusive) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'fromDate must precede toDateExclusive' });
  }
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT
      set_config('splitpro.balance_from', ${input?.fromDate?.toISOString() ?? ''}, true),
      set_config('splitpro.balance_to', ${toDateExclusive.toISOString()}, true)`;
    return query(tx);
  });
};
