import { SplitType } from '@prisma/client';

import { getParticipantShare, hasShareBreakdown } from '~/lib/expenseShare';

describe('getParticipantShare', () => {
  describe('Equal split', () => {
    const expense = { paidBy: 1, amount: 10000n };

    it('should return the payer share from their net amount', () => {
      expect(getParticipantShare({ userId: 1, amount: 7500n }, expense)).toBe(2500n);
    });

    it('should return the share of someone who did not pay', () => {
      expect(getParticipantShare({ userId: 2, amount: -2500n }, expense)).toBe(2500n);
    });
  });

  describe('Payer not in the split', () => {
    it('should return a zero share for the payer', () => {
      expect(
        getParticipantShare({ userId: 1, amount: 10000n }, { paidBy: 1, amount: 10000n }),
      ).toBe(0n);
    });
  });

  describe('Exact split', () => {
    const expense = { paidBy: 1, amount: 10000n };

    it('should return each exact share', () => {
      expect(getParticipantShare({ userId: 1, amount: 9000n }, expense)).toBe(1000n);
      expect(getParticipantShare({ userId: 2, amount: -6000n }, expense)).toBe(6000n);
      expect(getParticipantShare({ userId: 3, amount: -3000n }, expense)).toBe(3000n);
    });
  });
});

describe('hasShareBreakdown', () => {
  describe('Spending', () => {
    it('should allow a regular expense', () => {
      expect(hasShareBreakdown({ amount: 10000n, splitType: SplitType.EQUAL })).toBe(true);
    });

    it('should not allow a refund', () => {
      expect(hasShareBreakdown({ amount: -10000n, splitType: SplitType.EQUAL })).toBe(false);
    });

    it('should not allow a zero amount', () => {
      expect(hasShareBreakdown({ amount: 0n, splitType: SplitType.EQUAL })).toBe(false);
    });
  });

  describe('Money moving between people', () => {
    it('should not allow settlements or currency conversions', () => {
      expect(hasShareBreakdown({ amount: 10000n, splitType: SplitType.SETTLEMENT })).toBe(false);
      expect(hasShareBreakdown({ amount: 10000n, splitType: SplitType.CURRENCY_CONVERSION })).toBe(
        false,
      );
    });
  });
});
