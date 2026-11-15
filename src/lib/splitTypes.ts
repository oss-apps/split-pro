import { SplitType } from '@prisma/client';

// Settlements and currency conversions move money between people; they aren't spending.
export const NON_SPENDING_SPLIT_TYPES = [
  SplitType.SETTLEMENT,
  SplitType.CURRENCY_CONVERSION,
] as const satisfies readonly SplitType[];

export const isSpendingSplitType = (splitType: SplitType) =>
  !(NON_SPENDING_SPLIT_TYPES as readonly SplitType[]).includes(splitType);
