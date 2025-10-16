import { faker } from '@faker-js/faker';
import { SplitType } from '@prisma/client';

/**
 * Generates realistic split shares for expense distribution
 * Each function returns an object mapping participant IDs to their share values
 * These shares are then used with calculateParticipantSplit from addStore to compute actual amounts
 */

interface ParticipantId {
  id: number;
}

/**
 * Generates equal split shares - all participants get the same mark (1n or 0n)
 * All participants are included in the split
 *
 * @param participants - Array of participant IDs
 * @returns Record mapping participant ID to share value (0n = excluded, 1n = included)
 */
export const generateEqualShares = (participants: ParticipantId[]): Record<number, bigint> =>
  participants.reduce<Record<number, bigint>>((acc, p) => {
    acc[p.id] = 1n; // All participants included in equal split
    return acc;
  }, {});

/**
 * Generates percentage-based split shares
 * Randomly distributes percentages that sum to 100
 * Each percentage is stored as a value from 0-10000 (representing 0-100%)
 *
 * @param participants - Array of participant IDs
 * @returns Record mapping participant ID to percentage share (0-10000 representing 0-100%)
 */
export const generatePercentageShares = (participants: ParticipantId[]): Record<number, bigint> => {
  if (participants.length === 0) {
    return {};
  }

  if (participants.length === 1) {
    return { [participants[0]!.id]: 10000n }; // 100%
  }

  // Generate random percentages for first n-1 participants
  const percentages = participants.slice(0, -1).map(() => faker.number.int({ min: 1, max: 99 }));

  const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
  const lastParticipantPercentage = Math.max(0, 100 - totalPercentage);

  // Convert percentages to the format used (0-10000)
  const shares: Record<number, bigint> = {};
  percentages.forEach((percentage, index) => {
    shares[participants[index]!.id] = BigInt(percentage * 100);
  });
  shares[participants[participants.length - 1]!.id] = BigInt(lastParticipantPercentage * 100);

  return shares;
};

/**
 * Generates share-based split shares
 * Each participant gets a number of shares (e.g., 2 shares, 1 share)
 * Stored as values multiplied by 100 for precision
 *
 * @param participants - Array of participant IDs
 * @returns Record mapping participant ID to share count (multiplied by 100)
 */
export const generateShareBasedShares = (participants: ParticipantId[]): Record<number, bigint> => {
  if (participants.length === 0) {
    return {};
  }

  return participants.reduce<Record<number, bigint>>((acc, p) => {
    // Each participant gets 1-4 shares
    const shareCount = faker.number.int({ min: 1, max: 4 });
    acc[p.id] = BigInt(shareCount * 100);
    return acc;
  }, {});
};

/**
 * Generates exact split shares
 * Each participant specifies their exact amount
 * For this generation, we'll split evenly for simplicity
 * Actual amounts are determined by calculateParticipantSplit
 *
 * @param participants - Array of participant IDs
 * @param totalAmount - Total expense amount in cents
 * @returns Record mapping participant ID to their exact share amount
 */
export const generateExactShares = (
  participants: ParticipantId[],
  totalAmount: bigint,
): Record<number, bigint> => {
  if (participants.length === 0) {
    return {};
  }

  // For exact shares, we'll do a simple equal split by default
  // In real scenarios, this would be customized
  const sharePerPerson = totalAmount / BigInt(participants.length);
  const remainder = totalAmount % BigInt(participants.length);

  const shares: Record<number, bigint> = {};

  participants.forEach((p, index) => {
    // Distribute remainder to first participant(s)
    const extra = index < Number(remainder) ? 1n : 0n;
    shares[p.id] = sharePerPerson + extra;
  });

  return shares;
};

/**
 * Generates adjustment-based split shares
 * Participants specify adjustments on top of a base equal split
 * Can be positive (owes more) or negative (owes less)
 *
 * @param participants - Array of participant IDs
 * @param totalAmount - Total expense amount in cents
 * @returns Record mapping participant ID to adjustment amount
 */
export const generateAdjustmentShares = (
  participants: ParticipantId[],
  totalAmount: bigint,
): Record<number, bigint> => {
  if (participants.length === 0) {
    return {};
  }

  const baseAmount = totalAmount / BigInt(participants.length);

  const shares: Record<number, bigint> = {};
  let totalAdjustment = 0n;

  // Generate adjustments for all but the last participant
  participants.slice(0, -1).forEach((p) => {
    const adjustment = BigInt(faker.number.int({ min: -25, max: 25 })) * (baseAmount / 100n);
    shares[p.id] = adjustment;
    totalAdjustment += adjustment;
  });

  // Last participant gets adjustment to balance everything out
  shares[participants[participants.length - 1]!.id] = -totalAdjustment;

  return shares;
};

/**
 * Main function to generate split shares based on split type
 * Returns a record mapping participant IDs to their share values
 *
 * @param splitType - The type of split (EQUAL, PERCENTAGE, SHARE, EXACT, ADJUSTMENT)
 * @param participants - Array of participant IDs
 * @param totalAmount - Total expense amount in cents (used for EXACT and ADJUSTMENT types)
 * @returns Record mapping participant ID to share value appropriate for the split type
 *
 * @example
 * generateSplitShares(SplitType.PERCENTAGE, [{id: 1}, {id: 2}, {id: 3}], 10000n)
 * // Returns: { 1: 3500n, 2: 4000n, 3: 2500n } (35%, 40%, 25%)
 */
export const generateSplitShares = (
  splitType: SplitType,
  participants: ParticipantId[],
  totalAmount = 0n,
): Record<number, bigint> => {
  switch (splitType) {
    case SplitType.EQUAL:
      return generateEqualShares(participants);

    case SplitType.PERCENTAGE:
      return generatePercentageShares(participants);

    case SplitType.SHARE:
      return generateShareBasedShares(participants);

    case SplitType.EXACT:
      return generateExactShares(participants, totalAmount);

    case SplitType.ADJUSTMENT:
      return generateAdjustmentShares(participants, totalAmount);

    default:
      // Fallback to equal split for unknown types
      return generateEqualShares(participants);
  }
};
