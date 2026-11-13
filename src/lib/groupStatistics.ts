import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { BigMath, currencyConversion } from '~/utils/numbers';

export interface StatisticsExpense {
  paidBy: number;
  currency: string;
  amount: bigint;
  expenseParticipants: { userId: number; amount: bigint }[];
}

export interface MemberTotal {
  userId: number;
  currency: string;
  paid: bigint;
  share: bigint;
}

/**
 * Sums, per user and currency, how much each person paid and how much of the expenses was theirs.
 * Participant amounts are net: the payer holds `amount - ownShare`, everyone else `-share`.
 */
export const computeMemberTotals = (expenses: StatisticsExpense[]): MemberTotal[] => {
  const totals = new Map<string, MemberTotal>();

  const totalFor = (userId: number, currency: string) => {
    const key = `${userId}:${currency}`;
    const existing = totals.get(key);
    if (existing) {
      return existing;
    }
    const created = { userId, currency, paid: 0n, share: 0n };
    totals.set(key, created);
    return created;
  };

  expenses.forEach((expense) => {
    totalFor(expense.paidBy, expense.currency).paid += expense.amount;
    expense.expenseParticipants.forEach((participant) => {
      const paidAmount = participant.userId === expense.paidBy ? expense.amount : 0n;
      totalFor(participant.userId, expense.currency).share += paidAmount - participant.amount;
    });
  });

  return [...totals.values()];
};

/** Currencies used by the expenses, most expenses first (ties broken alphabetically). */
export const currenciesByUse = (expenses: Pick<StatisticsExpense, 'currency'>[]): string[] => {
  const counts = expenses.reduce<Map<string, number>>(
    (acc, { currency }) => acc.set(currency, (acc.get(currency) ?? 0) + 1),
    new Map(),
  );
  return [...counts.keys()].sort(
    (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b),
  );
};

/** Returns `part / total` as a fraction (0.25 for 25%), or null when the total is zero. */
export const toFraction = (part: bigint, total: bigint): number | null =>
  0n === total ? null : Number(BigMath.roundDiv(part * 10000n, total)) / 10000;

/**
 * Sums amounts in several currencies into `to`. Returns null when a rate is missing, so callers
 * can hide derived numbers instead of showing a wrong one.
 */
export const sumInCurrency = (
  amounts: { currency: string; amount: bigint }[],
  to: CurrencyCode,
  rates: Map<string, number>,
): bigint | null =>
  amounts.reduce<bigint | null>((sum, { currency, amount }) => {
    if (null === sum) {
      return null;
    }
    if (currency === to) {
      return sum + amount;
    }
    const rate = rates.get(currency);
    if (undefined === rate || !isCurrencyCode(currency)) {
      return null;
    }
    return sum + currencyConversion({ from: currency, to, amount, rate });
  }, 0n);
