import { SplitType, type User } from '@prisma/client';

import {
  type Participant,
  calculateParticipantSplit,
  calculateSplitShareBasedOnAmount,
  initSplitShares,
} from './addStore';

// Mock dependencies
jest.mock('~/utils/array', () => ({
  shuffleArray: jest.fn(<T>(arr: T[]): T[] => arr), // No shuffling for predictable tests
}));

// Create mock users for testing
const createMockUser = (id: number, name: string, email: string): User => ({
  id,
  name,
  email,
  currency: 'USD',
  emailVerified: null,
  image: null,
});

const user1: User = createMockUser(1, 'Alice', 'alice@example.com');
const user2: User = createMockUser(2, 'Bob', 'bob@example.com');
const user3: User = createMockUser(3, 'Charlie', 'charlie@example.com');

// Create participants with initial amounts
const createParticipants = (users: User[], amounts: bigint[] = []): Participant[] => {
  return users.map((user, index) => ({
    ...user,
    amount: amounts[index] ?? 0n,
  }));
};

// Helper to create split shares structure
const createSplitShares = (participants: Participant[], splitType: SplitType, shares: bigint[]) => {
  const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};

  participants.forEach((participant, index) => {
    splitShares[participant.id] = initSplitShares();
    splitShares[participant.id]![splitType] = shares[index] ?? 0n;
  });

  return splitShares;
};

describe('calculateParticipantSplit', () => {
  describe('Edge cases', () => {
    it('should return participants unchanged when amount is 0', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 1n]);

      const result = calculateParticipantSplit(
        0n,
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      expect(result.participants).toEqual(participants);
      expect(result.canSplitScreenClosed).toBe(true);
    });
    it('should handle empty participants array', () => {
      const result = calculateParticipantSplit(10000n, [], SplitType.EQUAL, {}, undefined);

      expect(result.participants).toEqual([]);
      expect(result.canSplitScreenClosed).toBe(false);
    });
  });

  describe('SplitType.EQUAL', () => {
    it('should split amount equally among all participants', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 1n]);

      const result = calculateParticipantSplit(
        30000n, // $300.00
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // Each person should owe $100 (10000n), but payer gets the difference
      expect(result.participants[0]?.amount).toBe(20000n); // Payer: -10000n + 30000n = 20000n
      expect(result.participants[1]?.amount).toBe(-10000n); // Owes $100
      expect(result.participants[2]?.amount).toBe(-10000n); // Owes $100
      expect(result.canSplitScreenClosed).toBe(true);
    });

    it('should exclude participants with 0 share from equal split', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 0n]);

      const result = calculateParticipantSplit(
        20000n, // $200.00
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // Only first two participants split the cost
      expect(result.participants[0]?.amount).toBe(10000n); // Payer: -10000n + 20000n = 10000n
      expect(result.participants[1]?.amount).toBe(-10000n); // Owes $100
      expect(result.participants[2]?.amount).toBe(0n); // Excluded from split
    });

    it('should handle uneven division with penny adjustment', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 1n]);

      const result = calculateParticipantSplit(
        10001n, // $100.01 (not evenly divisible by 3)
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // Should distribute the extra penny
      const totalOwed = result.participants.reduce((sum, p) => sum + (p.amount ?? 0n), 0n);
      expect(totalOwed).toBe(0n); // Total should always balance      // Payer should get the remainder
      expect(result.participants[0]?.amount).toBeGreaterThanOrEqual(6667n);
    });
  });

  describe('SplitType.PERCENTAGE', () => {
    it('should split amount by percentage', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.PERCENTAGE, [
        5000n, // 50%
        3000n, // 30%
        2000n, // 20%
      ]);

      const result = calculateParticipantSplit(
        10000n, // $100.00
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(5000n); // Payer: -5000n + 10000n = 5000n
      expect(result.participants[1]?.amount).toBe(-3000n); // Owes 30%
      expect(result.participants[2]?.amount).toBe(-2000n); // Owes 20%
      expect(result.canSplitScreenClosed).toBe(true);
    });

    it('should mark incomplete when percentages do not sum to 100%', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.PERCENTAGE, [
        4000n, // 40%
        3000n, // 30%
        2000n, // 20% (total = 90%)
      ]);

      const result = calculateParticipantSplit(
        10000n,
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      expect(result.canSplitScreenClosed).toBe(false);
    });

    it('should handle 0% share participants', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.PERCENTAGE, [
        7000n, // 70%
        3000n, // 30%
        0n, // 0%
      ]);

      const result = calculateParticipantSplit(
        10000n,
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(3000n); // Payer: -7000n + 10000n
      expect(result.participants[1]?.amount).toBe(-3000n);
      expect(result.participants[2]?.amount).toBe(0n); // No share
    });
  });

  describe('SplitType.SHARE', () => {
    it('should split amount by shares', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.SHARE, [
        200n, // 2 shares
        100n, // 1 share
        100n, // 1 share (total = 4 shares)
      ]);

      const result = calculateParticipantSplit(
        12000n, // $120.00
        participants,
        SplitType.SHARE,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(6000n); // Payer: -6000n + 12000n = 6000n (50%)
      expect(result.participants[1]?.amount).toBe(-3000n); // 25%
      expect(result.participants[2]?.amount).toBe(-3000n); // 25%
      expect(result.canSplitScreenClosed).toBe(true);
    });

    it('should handle participants with 0 shares', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.SHARE, [
        300n, // 3 shares
        100n, // 1 share
        0n, // 0 shares
      ]);

      const result = calculateParticipantSplit(
        8000n,
        participants,
        SplitType.SHARE,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(2000n); // Payer: -6000n + 8000n (75%)
      expect(result.participants[1]?.amount).toBe(-2000n); // 25%
      expect(result.participants[2]?.amount).toBe(0n); // No shares
    });

    it('should mark incomplete when no shares are assigned', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.SHARE, [0n, 0n, 0n]);

      const result = calculateParticipantSplit(
        10000n,
        participants,
        SplitType.SHARE,
        splitShares,
        user1,
      );

      expect(result.canSplitScreenClosed).toBe(false);
    });
  });

  describe('SplitType.EXACT', () => {
    it('should assign exact amounts to participants', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EXACT, [
        4000n, // $40.00
        3000n, // $30.00
        3000n, // $30.00
      ]);

      const result = calculateParticipantSplit(
        10000n, // $100.00
        participants,
        SplitType.EXACT,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(6000n); // Payer: -4000n + 10000n
      expect(result.participants[1]?.amount).toBe(-3000n);
      expect(result.participants[2]?.amount).toBe(-3000n);
      expect(result.canSplitScreenClosed).toBe(true);
    });

    it('should mark incomplete when exact amounts do not sum to total', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EXACT, [
        4000n, // $40.00
        3000n, // $30.00
        2000n, // $20.00 (total = $90.00)
      ]);

      const result = calculateParticipantSplit(
        10000n, // $100.00
        participants,
        SplitType.EXACT,
        splitShares,
        user1,
      );

      expect(result.canSplitScreenClosed).toBe(false);
    });

    it('should handle undefined exact amounts as 0', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EXACT, [
        10000n, // $100.00
        0n, // $0.00
        0n, // $0.00
      ]);

      const result = calculateParticipantSplit(
        10000n,
        participants,
        SplitType.EXACT,
        splitShares,
        user1,
      );

      expect(result.participants[0]?.amount).toBe(0n); // Payer: -10000n + 10000n
      expect(result.participants[1]?.amount).toBe(0n);
      expect(result.participants[2]?.amount).toBe(0n);
    });
  });

  describe('SplitType.ADJUSTMENT', () => {
    it('should distribute remaining amount equally after adjustments', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.ADJUSTMENT, [
        1000n, // +$10.00 adjustment
        -500n, // -$5.00 adjustment
        0n, // No adjustment
      ]);

      const result = calculateParticipantSplit(
        15000n, // $150.00
        participants,
        SplitType.ADJUSTMENT,
        splitShares,
        user1,
      );

      // Remaining after adjustments: 15000n - 1000n - (-500n) - 0n = 14500n
      // Split equally: 14500n / 3 = ~4833n each
      const baseShare = (15000n - 1000n - -500n - 0n) / 3n; // 4833n

      expect(result.participants[0]?.amount).toBe(9166n); // Payer adjustment (adjusted for rounding)
      expect(result.participants[1]?.amount).toBe(-(baseShare - 500n));
      expect(result.participants[2]?.amount).toBe(-baseShare);
    });

    it('should mark incomplete when adjustments exceed total amount', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.ADJUSTMENT, [
        8000n, // Large positive adjustment
        5000n, // Another large adjustment
        0n,
      ]);

      const result = calculateParticipantSplit(
        10000n, // Total amount smaller than adjustments
        participants,
        SplitType.ADJUSTMENT,
        splitShares,
        user1,
      );

      expect(result.canSplitScreenClosed).toBe(false);
    });
  });

  describe('Payer scenarios', () => {
    it('should handle different payers correctly', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 1n]);

      // Test with user2 as payer
      const result = calculateParticipantSplit(
        30000n,
        participants,
        SplitType.EQUAL,
        splitShares,
        user2,
      );

      expect(result.participants[0]?.amount).toBe(-10000n); // Owes
      expect(result.participants[1]?.amount).toBe(20000n); // Payer: -10000n + 30000n
      expect(result.participants[2]?.amount).toBe(-10000n); // Owes
    });

    it('should handle when payer is not in participants list', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n, 1n]);

      const externalPayer = createMockUser(4, 'David', 'david@example.com');

      const result = calculateParticipantSplit(
        30000n,
        participants,
        SplitType.EQUAL,
        splitShares,
        externalPayer,
      ); // All participants should owe their share but total balances to 0 due to penny adjustment
      expect(result.participants[0]?.amount).toBe(0n);
      expect(result.participants[1]?.amount).toBe(0n);
      expect(result.participants[2]?.amount).toBe(0n);
    });
  });

  describe('Balance verification', () => {
    it('should always maintain balance (total amounts sum to 0)', () => {
      const participants = createParticipants([user1, user2, user3]);
      const splitShares = createSplitShares(participants, SplitType.PERCENTAGE, [
        4000n, // 40%
        3500n, // 35%
        2500n, // 25%
      ]);

      const result = calculateParticipantSplit(
        12345n, // Odd amount
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      const totalAmount = result.participants.reduce((sum, p) => sum + (p.amount ?? 0n), 0n);

      expect(totalAmount).toBe(0n);
    });

    it('should handle penny adjustments correctly', () => {
      const participants = createParticipants([user1, user2]);
      const splitShares = createSplitShares(participants, SplitType.EQUAL, [1n, 1n]);

      const result = calculateParticipantSplit(
        1n, // $0.01
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // One participant should get the penny
      const totalAmount = result.participants.reduce((sum, p) => sum + (p.amount ?? 0n), 0n);

      expect(totalAmount).toBe(0n);
    });
  });
});

describe('calculateSplitShareBasedOnAmount', () => {
  describe('SplitType.EQUAL', () => {
    it('should set equal shares for participants with non-zero amounts', () => {
      const participants = createParticipants([user1, user2, user3], [5000n, 5000n, 0n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EQUAL, splitShares, user1);

      expect(splitShares[user1.id]![SplitType.EQUAL]).toBe(1n);
      expect(splitShares[user2.id]![SplitType.EQUAL]).toBe(1n);
      expect(splitShares[user3.id]![SplitType.EQUAL]).toBe(0n); // Zero amount
    });

    it('should set zero shares for participants with zero amounts', () => {
      const participants = createParticipants([user1, user2, user3], [0n, 0n, 0n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EQUAL, splitShares, user1);

      expect(splitShares[user1.id]![SplitType.EQUAL]).toBe(0n);
      expect(splitShares[user2.id]![SplitType.EQUAL]).toBe(0n);
      expect(splitShares[user3.id]![SplitType.EQUAL]).toBe(0n);
    });
  });

  describe('SplitType.PERCENTAGE', () => {
    it('should calculate percentage shares for regular participants', () => {
      const participants = createParticipants([user1, user2, user3], [-3000n, -2000n, -5000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.PERCENTAGE, splitShares);

      expect(splitShares[user1.id]![SplitType.PERCENTAGE]).toBe(3000n); // 30%
      expect(splitShares[user2.id]![SplitType.PERCENTAGE]).toBe(2000n); // 20%
      expect(splitShares[user3.id]![SplitType.PERCENTAGE]).toBe(5000n); // 50%
    });

    it('should calculate percentage shares when payer is specified', () => {
      const participants = createParticipants([user1, user2, user3], [8000n, -3000n, -5000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        10000n,
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      // user1 is payer: paid 10000n but their amount is 8000n, so they owe 2000n (20%)
      expect(splitShares[user1.id]![SplitType.PERCENTAGE]).toBe(2000n); // 20%
      expect(splitShares[user2.id]![SplitType.PERCENTAGE]).toBe(3000n); // 30%
      expect(splitShares[user3.id]![SplitType.PERCENTAGE]).toBe(5000n); // 50%
    });

    it('should handle zero amount', () => {
      const participants = createParticipants([user1, user2, user3], [-3000n, -2000n, -5000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(0n, participants, SplitType.PERCENTAGE, splitShares);

      expect(splitShares[user1.id]![SplitType.PERCENTAGE]).toBe(0n);
      expect(splitShares[user2.id]![SplitType.PERCENTAGE]).toBe(0n);
      expect(splitShares[user3.id]![SplitType.PERCENTAGE]).toBe(0n);
    });
  });

  describe('SplitType.SHARE', () => {
    it('should calculate share values based on participant amounts', () => {
      const participants = createParticipants([user1, user2, user3], [-6000n, -3000n, -3000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(12000n, participants, SplitType.SHARE, splitShares);

      // Shares should be proportional: 6000:3000:3000 = 2:1:1
      // Multiplied by 100 and normalized
      expect(splitShares[user1.id]![SplitType.SHARE]).toBe(200n); // 2 shares * 100
      expect(splitShares[user2.id]![SplitType.SHARE]).toBe(100n); // 1 share * 100
      expect(splitShares[user3.id]![SplitType.SHARE]).toBe(100n); // 1 share * 100
    });

    it('should handle payer in share calculation', () => {
      const participants = createParticipants([user1, user2, user3], [6000n, -3000n, -3000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(12000n, participants, SplitType.SHARE, splitShares, user1);

      // user1 is payer: paid 12000n but their amount is 6000n, so they owe 6000n
      // Shares: 6000:3000:3000 = 2:1:1
      expect(splitShares[user1.id]![SplitType.SHARE]).toBe(200n);
      expect(splitShares[user2.id]![SplitType.SHARE]).toBe(100n);
      expect(splitShares[user3.id]![SplitType.SHARE]).toBe(100n);
    });

    it('should handle zero amount', () => {
      const participants = createParticipants([user1, user2, user3], [-6000n, -3000n, -3000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(0n, participants, SplitType.SHARE, splitShares);

      expect(splitShares[user1.id]![SplitType.SHARE]).toBe(0n);
      expect(splitShares[user2.id]![SplitType.SHARE]).toBe(0n);
      expect(splitShares[user3.id]![SplitType.SHARE]).toBe(0n);
    });
  });

  describe('SplitType.EXACT', () => {
    it('should set exact amounts for regular participants', () => {
      const participants = createParticipants([user1, user2, user3], [-4000n, -3000n, -3000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EXACT, splitShares);

      expect(splitShares[user1.id]![SplitType.EXACT]).toBe(4000n);
      expect(splitShares[user2.id]![SplitType.EXACT]).toBe(3000n);
      expect(splitShares[user3.id]![SplitType.EXACT]).toBe(3000n);
    });

    it('should handle payer in exact calculation', () => {
      const participants = createParticipants([user1, user2, user3], [6000n, -3000n, -3000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EXACT, splitShares, user1);

      // user1 is payer: paid 10000n but their amount is 6000n, so they owe 4000n
      expect(splitShares[user1.id]![SplitType.EXACT]).toBe(4000n);
      expect(splitShares[user2.id]![SplitType.EXACT]).toBe(3000n);
      expect(splitShares[user3.id]![SplitType.EXACT]).toBe(3000n);
    });

    it('should handle zero amounts', () => {
      const participants = createParticipants([user1, user2, user3], [0n, 0n, 0n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EXACT, splitShares);

      expect(splitShares[user1.id]![SplitType.EXACT]).toBe(0n);
      expect(splitShares[user2.id]![SplitType.EXACT]).toBe(0n);
      expect(splitShares[user3.id]![SplitType.EXACT]).toBe(0n);
    });
  });

  describe('SplitType.ADJUSTMENT', () => {
    it('should handle payer in adjustment calculation', () => {
      const participants = createParticipants([user1, user2, user3], [-9500n, -4500n, -5000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        15000n,
        participants,
        SplitType.ADJUSTMENT,
        splitShares,
        user1,
      );

      expect(splitShares[user1.id]![SplitType.ADJUSTMENT]).toBe(1000n);
      expect(splitShares[user2.id]![SplitType.ADJUSTMENT]).toBe(0n);
      expect(splitShares[user3.id]![SplitType.ADJUSTMENT]).toBe(500n);
    });

    it('should handle participants with zero amounts', () => {
      const participants = createParticipants([user1, user2, user3], [0n, -5000n, 0n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(5000n, participants, SplitType.ADJUSTMENT, splitShares);

      // Only user2 has non-zero amount, so equal share = 5000n / 1 = 5000n
      // user2 owes 5000n vs 5000n = 0n adjustment
      expect(splitShares[user1.id]![SplitType.ADJUSTMENT]).toBe(-5000n); // 0 - 5000n
      expect(splitShares[user2.id]![SplitType.ADJUSTMENT]).toBe(0n); // 5000n - 5000n
      expect(splitShares[user3.id]![SplitType.ADJUSTMENT]).toBe(-5000n); // 0 - 5000n
    });
  });

  describe('Edge cases', () => {
    it('should handle empty participants array', () => {
      const participants: Participant[] = [];
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};

      calculateSplitShareBasedOnAmount(10000n, participants, SplitType.EQUAL, splitShares);

      // Should not throw an error and splitShares should remain empty
      expect(Object.keys(splitShares)).toHaveLength(0);
    });

    it('should handle undefined paidBy', () => {
      const participants = createParticipants([user1, user2], [-5000n, -5000n]);
      const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        splitShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        10000n,
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        undefined,
      );

      expect(splitShares[user1.id]![SplitType.PERCENTAGE]).toBe(5000n);
      expect(splitShares[user2.id]![SplitType.PERCENTAGE]).toBe(5000n);
    });

    it('should handle all split types with same data', () => {
      const participants = createParticipants([user1, user2], [-6000n, -4000n]);

      Object.values(SplitType).forEach((splitType) => {
        if (splitType === SplitType.SETTLEMENT) {
          return;
        } // Skip settlement as it's not implemented

        const splitShares: Record<number, Record<SplitType, bigint | undefined>> = {};
        participants.forEach((p) => {
          splitShares[p.id] = initSplitShares();
        });

        // Should not throw for any split type
        expect(() => {
          calculateSplitShareBasedOnAmount(10000n, participants, splitType, splitShares);
        }).not.toThrow();
      });
    });
  });
});

// Integration tests for function reversibility
describe('Function Reversibility Tests', () => {
  describe('calculateParticipantSplit -> calculateSplitShareBasedOnAmount', () => {
    it('should properly reverse EQUAL split', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [1n, 1n, 1n];
      const splitShares = createSplitShares(participants, SplitType.EQUAL, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        15000n,
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        15000n,
        splitResult.participants,
        SplitType.EQUAL,
        reversedShares,
        user1,
      );

      // Check if we got back the original shares
      expect(reversedShares[user1.id]![SplitType.EQUAL]).toBe(originalShares[0]);
      expect(reversedShares[user2.id]![SplitType.EQUAL]).toBe(originalShares[1]);
      expect(reversedShares[user3.id]![SplitType.EQUAL]).toBe(originalShares[2]);
    });

    it('should properly reverse PERCENTAGE split', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [5000n, 3000n, 2000n]; // 50%, 30%, 20%
      const splitShares = createSplitShares(participants, SplitType.PERCENTAGE, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        20000n,
        participants,
        SplitType.PERCENTAGE,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        20000n,
        splitResult.participants,
        SplitType.PERCENTAGE,
        reversedShares,
        user1,
      );

      // Check if we got back the original percentage shares
      expect(reversedShares[user1.id]![SplitType.PERCENTAGE]).toBe(originalShares[0]);
      expect(reversedShares[user2.id]![SplitType.PERCENTAGE]).toBe(originalShares[1]);
      expect(reversedShares[user3.id]![SplitType.PERCENTAGE]).toBe(originalShares[2]);
    });

    it('should properly reverse SHARE split', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [400n, 200n, 200n]; // 2:1:1 ratio
      const splitShares = createSplitShares(participants, SplitType.SHARE, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        16000n,
        participants,
        SplitType.SHARE,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        16000n,
        splitResult.participants,
        SplitType.SHARE,
        reversedShares,
        user1,
      );

      // Check if we got back proportional shares (should maintain the 2:1:1 ratio)
      const ratio1 = Number(reversedShares[user1.id]![SplitType.SHARE]) / Number(originalShares[0]);
      const ratio2 = Number(reversedShares[user2.id]![SplitType.SHARE]) / Number(originalShares[1]);
      const ratio3 = Number(reversedShares[user3.id]![SplitType.SHARE]) / Number(originalShares[2]);

      // All ratios should be approximately equal (accounting for rounding)
      expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.1);
      expect(Math.abs(ratio2 - ratio3)).toBeLessThan(0.1);
    });

    it('should properly reverse EXACT split', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [6000n, 4000n, 2000n];
      const splitShares = createSplitShares(participants, SplitType.EXACT, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        12000n,
        participants,
        SplitType.EXACT,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        12000n,
        splitResult.participants,
        SplitType.EXACT,
        reversedShares,
        user1,
      );

      // Check if we got back the original exact amounts
      expect(reversedShares[user1.id]![SplitType.EXACT]).toBe(originalShares[0]);
      expect(reversedShares[user2.id]![SplitType.EXACT]).toBe(originalShares[1]);
      expect(reversedShares[user3.id]![SplitType.EXACT]).toBe(originalShares[2]);
    });

    it('should handle ADJUSTMENT split reversal (known to have bugs)', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [1000n, 0n, 500n]; // Various adjustments
      const splitShares = createSplitShares(participants, SplitType.ADJUSTMENT, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        12300n,
        participants,
        SplitType.ADJUSTMENT,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        12300n,
        splitResult.participants,
        SplitType.ADJUSTMENT,
        reversedShares,
        user1,
      );

      expect(reversedShares[user1.id]![SplitType.ADJUSTMENT]).toBe(originalShares[0]);
      expect(reversedShares[user2.id]![SplitType.ADJUSTMENT]).toBe(originalShares[1]);
      expect(reversedShares[user3.id]![SplitType.ADJUSTMENT]).toBe(originalShares[2]);
    });

    it('should handle edge case with zero amounts', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [1n, 1n, 0n]; // One participant excluded
      const splitShares = createSplitShares(participants, SplitType.EQUAL, originalShares);

      // Apply split calculation
      const splitResult = calculateParticipantSplit(
        10000n,
        participants,
        SplitType.EQUAL,
        splitShares,
        user1,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        10000n,
        splitResult.participants,
        SplitType.EQUAL,
        reversedShares,
        user1,
      );

      // Check if we preserved the zero share
      expect(reversedShares[user1.id]![SplitType.EQUAL]).toBe(originalShares[0]);
      expect(reversedShares[user2.id]![SplitType.EQUAL]).toBe(originalShares[1]);
      expect(reversedShares[user3.id]![SplitType.EQUAL]).toBe(originalShares[2]);
    });

    it('should handle external payer scenario', () => {
      const participants = createParticipants([user1, user2, user3]);
      const originalShares = [1n, 1n, 1n];
      const splitShares = createSplitShares(participants, SplitType.EQUAL, originalShares);
      const externalPayer = createMockUser(4, 'External', 'external@example.com');

      // Apply split calculation with external payer
      const splitResult = calculateParticipantSplit(
        15000n,
        participants,
        SplitType.EQUAL,
        splitShares,
        externalPayer,
      );

      // Reverse the calculation
      const reversedShares: Record<number, Record<SplitType, bigint | undefined>> = {};
      participants.forEach((p) => {
        reversedShares[p.id] = initSplitShares();
      });

      calculateSplitShareBasedOnAmount(
        15000n,
        splitResult.participants,
        SplitType.EQUAL,
        reversedShares,
        externalPayer,
      );

      // With external payer, all participants have 0 amounts due to balance adjustment
      // So reversed shares should all be 0
      expect(reversedShares[user1.id]![SplitType.EQUAL]).toBe(0n);
      expect(reversedShares[user2.id]![SplitType.EQUAL]).toBe(0n);
      expect(reversedShares[user3.id]![SplitType.EQUAL]).toBe(0n);
    });
  });
});
