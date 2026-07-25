import { SplitType } from '@prisma/client';

export const getGroupTotalsWhere = (groupId: number) => ({
  groupId,
  deletedAt: null,
  splitType: { not: SplitType.SETTLEMENT },
});

export const getGroupBalanceSummary = (
  balances: Record<string, number>,
  defaultCurrency: string,
) => {
  const nonzeroBalances = Object.entries(balances).filter(([, amount]) => 0 !== amount);
  const [currency, amount] = nonzeroBalances.reduce<[string, number]>(
    (largest, balance) => (Math.abs(balance[1]) > Math.abs(largest[1]) ? balance : largest),
    [defaultCurrency, 0],
  );

  return {
    amount,
    currency,
    multiCurrency: 1 < nonzeroBalances.length,
  };
};
