/**
 * Tests for per-expense settlement mode business logic.
 *
 * These cover the two pure-logic pieces added by the SETTLEMENT_MODE feature:
 *   1. Unsettled expense filter (which expenses show as unsettled for a user)
 *   2. settle authorization (who is allowed to mark a participant settled)
 *
 * No DB or tRPC context required — the logic is extracted below to match the
 * same pattern used by simplify.test.ts.
 */

import { SplitType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Minimal types mirroring what the DB returns
// ---------------------------------------------------------------------------

interface Participant {
  userId: number;
  amount: bigint;
  settledAt: Date | null;
}

interface Expense {
  id: string;
  paidBy: number;
  splitType: SplitType;
  deletedAt: Date | null;
  expenseParticipants: Participant[];
}

// ---------------------------------------------------------------------------
// Logic extracted from getUnsettledExpenses (expense.ts)
// ---------------------------------------------------------------------------

const EXCLUDED_TYPES = [SplitType.SETTLEMENT, SplitType.CURRENCY_CONVERSION];

function isUnsettledForUser(expense: Expense, userId: number): boolean {
  if (expense.paidBy === userId) {
    // Payer sees it as unsettled if any non-payer debtor hasn't settled
    return expense.expenseParticipants.some(
      (p) => p.userId !== userId && 0n > p.amount && null === p.settledAt,
    );
  }
  // Non-payer sees it as unsettled if their own row is unsettled
  const me = expense.expenseParticipants.find((p) => p.userId === userId);
  return me !== undefined && 0n > me.amount && null === me.settledAt;
}

function filterUnsettledExpenses(expenses: Expense[], userId: number): Expense[] {
  return expenses.filter(
    (e) =>
      null === e.deletedAt &&
      !EXCLUDED_TYPES.includes(e.splitType) &&
      isUnsettledForUser(e, userId),
  );
}

// ---------------------------------------------------------------------------
// Authorization logic extracted from settleExpenseForUser (expense.ts)
// ---------------------------------------------------------------------------

type SettleAuth =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' | 'cannot_settle_payer' };

function checkSettleAuth(
  callerId: number,
  targetUserId: number,
  paidBy: number,
): SettleAuth {
  if (targetUserId === paidBy) {
    return { ok: false, reason: 'cannot_settle_payer' };
  }
  if (callerId !== targetUserId && callerId !== paidBy) {
    return { ok: false, reason: 'unauthorized' };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_EXPENSE: Expense = {
  id: 'expense-1',
  paidBy: 1,
  splitType: SplitType.EQUAL,
  deletedAt: null,
  expenseParticipants: [
    { userId: 1, amount: 50n, settledAt: null }, // payer share (positive)
    { userId: 2, amount: -50n, settledAt: null }, // debtor A
    { userId: 3, amount: -50n, settledAt: null }, // debtor B
  ],
};

// ---------------------------------------------------------------------------
// Tests: unsettled expense filter
// ---------------------------------------------------------------------------

describe('filterUnsettledExpenses', () => {
  describe('debtor perspective (non-payer)', () => {
    it('includes expense when own share is unsettled', () => {
      const result = filterUnsettledExpenses([BASE_EXPENSE], 2);
      expect(result).toHaveLength(1);
    });

    it('excludes expense when own share is already settled', () => {
      const expense: Expense = {
        ...BASE_EXPENSE,
        expenseParticipants: [
          { userId: 1, amount: 50n, settledAt: null },
          { userId: 2, amount: -50n, settledAt: new Date() }, // settled
          { userId: 3, amount: -50n, settledAt: null },
        ],
      };
      const result = filterUnsettledExpenses([expense], 2);
      expect(result).toHaveLength(0);
    });

    it('excludes expense when user is not a participant', () => {
      const result = filterUnsettledExpenses([BASE_EXPENSE], 99);
      expect(result).toHaveLength(0);
    });
  });

  describe('payer perspective', () => {
    it('includes expense when at least one debtor is unsettled', () => {
      const result = filterUnsettledExpenses([BASE_EXPENSE], 1);
      expect(result).toHaveLength(1);
    });

    it('excludes expense when all debtors have settled', () => {
      const expense: Expense = {
        ...BASE_EXPENSE,
        expenseParticipants: [
          { userId: 1, amount: 50n, settledAt: null },
          { userId: 2, amount: -50n, settledAt: new Date() }, // settled
          { userId: 3, amount: -50n, settledAt: new Date() }, // settled
        ],
      };
      const result = filterUnsettledExpenses([expense], 1);
      expect(result).toHaveLength(0);
    });

    it('includes expense when only one debtor is unsettled', () => {
      const expense: Expense = {
        ...BASE_EXPENSE,
        expenseParticipants: [
          { userId: 1, amount: 50n, settledAt: null },
          { userId: 2, amount: -50n, settledAt: new Date() }, // settled
          { userId: 3, amount: -50n, settledAt: null }, // still unsettled
        ],
      };
      const result = filterUnsettledExpenses([expense], 1);
      expect(result).toHaveLength(1);
    });

    it('excludes payer own row from unsettled check (payer amount is positive)', () => {
      // Payer has positive amount — should never count as a debtor
      const expense: Expense = {
        ...BASE_EXPENSE,
        expenseParticipants: [
          { userId: 1, amount: 50n, settledAt: null }, // payer, positive, NOT a debt
          { userId: 2, amount: -50n, settledAt: new Date() }, // settled debtor
        ],
      };
      const result = filterUnsettledExpenses([expense], 1);
      expect(result).toHaveLength(0);
    });
  });

  describe('excluded expense types', () => {
    it('excludes SETTLEMENT expenses', () => {
      const expense: Expense = { ...BASE_EXPENSE, splitType: SplitType.SETTLEMENT };
      expect(filterUnsettledExpenses([expense], 2)).toHaveLength(0);
    });

    it('excludes CURRENCY_CONVERSION expenses', () => {
      const expense: Expense = { ...BASE_EXPENSE, splitType: SplitType.CURRENCY_CONVERSION };
      expect(filterUnsettledExpenses([expense], 2)).toHaveLength(0);
    });

    it('includes EXACT, PERCENTAGE, SHARE, ADJUSTMENT expenses', () => {
      const types = [SplitType.EXACT, SplitType.PERCENTAGE, SplitType.SHARE, SplitType.ADJUSTMENT];
      for (const splitType of types) {
        const expense: Expense = { ...BASE_EXPENSE, splitType };
        expect(filterUnsettledExpenses([expense], 2)).toHaveLength(1);
      }
    });
  });

  describe('deleted expenses', () => {
    it('excludes soft-deleted expenses', () => {
      const expense: Expense = { ...BASE_EXPENSE, deletedAt: new Date() };
      expect(filterUnsettledExpenses([expense], 2)).toHaveLength(0);
    });
  });

  describe('mixed list', () => {
    it('returns only the unsettled subset from a mixed list', () => {
      const settled: Expense = {
        ...BASE_EXPENSE,
        id: 'settled',
        expenseParticipants: [
          { userId: 1, amount: 50n, settledAt: null },
          { userId: 2, amount: -50n, settledAt: new Date() },
        ],
      };
      const unsettled: Expense = { ...BASE_EXPENSE, id: 'unsettled' };
      const deleted: Expense = { ...BASE_EXPENSE, id: 'deleted', deletedAt: new Date() };

      const result = filterUnsettledExpenses([settled, unsettled, deleted], 2);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('unsettled');
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: settle authorization
// ---------------------------------------------------------------------------

describe('checkSettleAuth', () => {
  const PAYER = 1;
  const DEBTOR = 2;
  const STRANGER = 3;

  it('allows debtor to settle their own share', () => {
    expect(checkSettleAuth(DEBTOR, DEBTOR, PAYER)).toEqual({ ok: true });
  });

  it('allows payer to mark a debtor settled', () => {
    expect(checkSettleAuth(PAYER, DEBTOR, PAYER)).toEqual({ ok: true });
  });

  it('rejects a stranger settling for the debtor', () => {
    const result = checkSettleAuth(STRANGER, DEBTOR, PAYER);
    expect(result).toEqual({ ok: false, reason: 'unauthorized' });
  });

  it('rejects settling the payer own row (payer cannot settle themselves)', () => {
    const result = checkSettleAuth(PAYER, PAYER, PAYER);
    expect(result).toEqual({ ok: false, reason: 'cannot_settle_payer' });
  });

  it('rejects stranger trying to settle payer row', () => {
    // Even if target = payer, the cannot_settle_payer check fires first
    const result = checkSettleAuth(STRANGER, PAYER, PAYER);
    expect(result).toEqual({ ok: false, reason: 'cannot_settle_payer' });
  });
});
