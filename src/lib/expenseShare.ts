import { type SplitType } from '@prisma/client';

import { isSpendingSplitType } from '~/lib/splitTypes';

/** Whether participants can be shown as "owes X and gets back Y" instead of net amounts. */
export const hasShareBreakdown = (expense: { amount: bigint; splitType: SplitType }) =>
  0n < expense.amount && isSpendingSplitType(expense.splitType);

/** A participant's share of an expense. Stored amounts are net: what they paid minus their share. */
export const getParticipantShare = (
  participant: { userId: number; amount: bigint },
  expense: { paidBy: number; amount: bigint },
) => (participant.userId === expense.paidBy ? expense.amount : 0n) - participant.amount;
