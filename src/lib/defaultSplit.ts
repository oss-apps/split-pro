import { z } from 'zod';
import { SplitType } from '@prisma/client';

export const DEFAULT_SPLIT_TYPES = [
  SplitType.EQUAL,
  SplitType.PERCENTAGE,
  SplitType.SHARE,
] as const;

export const defaultSplitInputSchema = z.object({
  splitType: z.enum(DEFAULT_SPLIT_TYPES),
  shares: z.record(z.string(), z.string()),
});

export type DefaultSplitType = (typeof DEFAULT_SPLIT_TYPES)[number];

export interface DefaultSplitConfig {
  splitType: DefaultSplitType;
  shares: Record<number, bigint>;
}

export interface SerializedDefaultSplitConfig {
  splitType: DefaultSplitType;
  shares: Record<string, string>;
}

export const isDefaultSplitType = (splitType: SplitType): splitType is DefaultSplitType =>
  DEFAULT_SPLIT_TYPES.includes(splitType as DefaultSplitType);

export const serializeDefaultSplit = (
  config: DefaultSplitConfig,
): SerializedDefaultSplitConfig => ({
  splitType: config.splitType,
  shares: Object.fromEntries(
    Object.entries(config.shares).map(([userId, share]) => [userId, share.toString()]),
  ),
});

export const deserializeDefaultSplit = (
  config:
    | {
        splitType: SplitType;
        shares: Record<string, string>;
      }
    | null
    | undefined,
): DefaultSplitConfig | null => {
  if (!config) {
    return null;
  }

  if (!isDefaultSplitType(config.splitType)) {
    return null;
  }

  return {
    splitType: config.splitType,
    shares: Object.fromEntries(
      Object.entries(config.shares)
        .map(([userId, share]) => {
          if ('' === share) {
            return null;
          }

          try {
            return [Number(userId), BigInt(share)] as const;
          } catch {
            return null;
          }
        })
        .filter((entry) => null !== entry),
    ),
  };
};

export const toSortedFriendPair = (userIdA: number, userIdB: number): [number, number] =>
  userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

export const parseSerializedDefaultSplit = (
  splitType: SplitType,
  shares: unknown,
): SerializedDefaultSplitConfig | null => {
  if (!isDefaultSplitType(splitType)) {
    return null;
  }

  const parsedShares = z.record(z.string(), z.string()).safeParse(shares);
  if (!parsedShares.success) {
    return null;
  }

  const parsed = deserializeDefaultSplit({ splitType, shares: parsedShares.data });
  if (!parsed) {
    return null;
  }

  return serializeDefaultSplit(parsed);
};
