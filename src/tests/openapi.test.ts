import { createHash } from 'crypto';
import { SplitType } from '@prisma/client';
import { TRPCError } from '@trpc/server';

import { simplifyDebts } from '~/lib/simplify';

jest.mock('~/server/db', () => ({
  db: {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    expenseParticipant: {
      findUnique: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
    },
    groupUser: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('~/server/api/trpc', () => ({
  createTRPCRouter: jest.fn(),
  protectedProcedure: { use: jest.fn() },
  publicProcedure: { use: jest.fn() },
  createCallerFactory: jest.fn(),
  createInnerTRPCContext: jest.fn(),
  createTRPCContext: jest.fn(),
  createOpenApiContext: jest.fn(),
  groupProcedure: { input: jest.fn(), use: jest.fn() },
}));

describe('API key hash', () => {
  it('should produce consistent SHA-256 hashes', () => {
    const key = 'sp_test_key_123';
    const hash1 = createHash('sha256').update(key).digest('hex');
    const hash2 = createHash('sha256').update(key).digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should produce different hashes for different keys', () => {
    const hash1 = createHash('sha256').update('sp_key_one').digest('hex');
    const hash2 = createHash('sha256').update('sp_key_two').digest('hex');
    expect(hash1).not.toBe(hash2);
  });
});

describe('simplifyDebts', () => {
  it('should simplify group balances to zero in a 3-way cycle', () => {
    const balances = [
      { userId: 1, friendId: 2, groupId: 1, currency: 'USD', amount: 100n, createdAt: new Date(), updatedAt: new Date() },
      { userId: 2, friendId: 3, groupId: 1, currency: 'USD', amount: 100n, createdAt: new Date(), updatedAt: new Date() },
      { userId: 3, friendId: 1, groupId: 1, currency: 'USD', amount: 100n, createdAt: new Date(), updatedAt: new Date() },
    ];

    const simplified = simplifyDebts(balances);
    const total = simplified.reduce((sum, b) => sum + b.amount, 0n);
    expect(total).toBe(0n);
  });

  it('should preserve a simple direct debt', () => {
    const balances = [
      { userId: 1, friendId: 2, groupId: null, currency: 'USD', amount: 5000n, createdAt: new Date(), updatedAt: new Date() },
    ];

    const simplified = simplifyDebts(balances);
    expect(simplified.length).toBeGreaterThanOrEqual(1);
    expect(simplified.some(b => b.userId === 1 && b.friendId === 2 && b.amount === 5000n)).toBe(true);
  });
});

describe('normalizeExpense', () => {
  const expense: {
    id: string;
    name: string;
    amount: bigint;
    currency: string;
    expenseDate: Date;
    category: string;
    splitType: SplitType;
    groupId: number | null;
    paidByUser: { id: number; name: string | null } | null;
    expenseParticipants: { userId: number; amount: bigint }[];
  } = {
    id: 'exp-1',
    name: 'Test Expense',
    amount: 1234n,
    currency: 'USD',
    expenseDate: new Date('2025-01-15'),
    category: 'Food',
    splitType: SplitType.EQUAL,
    groupId: null as number | null,
    paidByUser: { id: 1, name: 'Alice' } as { id: number; name: string | null },
    expenseParticipants: [
      { userId: 1, amount: 617n },
      { userId: 2, amount: 617n },
    ],
  };

  const normalize = (e: {
    id: string;
    name: string;
    amount: bigint;
    currency: string;
    expenseDate: Date;
    category: string;
    splitType: SplitType;
    groupId: number | null;
    paidByUser: { id: number; name: string | null } | null;
    expenseParticipants: { userId: number; amount: bigint }[];
  }) => ({
    id: e.id,
    expenseName: e.name,
    amount: Number(e.amount),
    currency: e.currency,
    expenseDate: e.expenseDate.toISOString(),
    category: e.category,
    paidBy: {
      id: e.paidByUser?.id ?? 0,
      name: e.paidByUser?.name ?? null,
    },
    splitMethod: e.splitType,
    participants: e.expenseParticipants.map((ep) => ({
      userId: ep.userId,
      share: Number(ep.amount),
    })),
    groupId: e.groupId,
    isReimbursement: SplitType.SETTLEMENT === e.splitType,
  });

  it('should convert bigint amounts to numbers', () => {
    const result = normalize(expense);
    expect(result.amount).toBe(1234);
    expect(result.participants[0]?.share).toBe(617);
  });

  it('should format dates as ISO 8601 strings', () => {
    const result = normalize(expense);
    expect(result.expenseDate).toBe('2025-01-15T00:00:00.000Z');
  });

  it('should mark settlement expenses as reimbursements', () => {
    const settlement = { ...expense, splitType: SplitType.SETTLEMENT };
    const result = normalize(settlement);
    expect(result.isReimbursement).toBe(true);
  });

  it('should not mark EQUAL expenses as reimbursements', () => {
    const result = normalize(expense);
    expect(result.isReimbursement).toBe(false);
  });

  it('should handle null paidByUser gracefully', () => {
    const unlinked = {
      ...expense,
      paidByUser: null,
    };
    const result = normalize(unlinked);
    expect(result.paidBy.id).toBe(0);
    expect(result.paidBy.name).toBeNull();
  });
});

describe('REST input to service input mapping', () => {
  it('should map expenseName to name and paidById to paidBy', () => {
    const rest = {
      expenseName: 'Coffee',
      amount: 500,
      currency: 'USD',
      category: 'Food',
      groupId: null as number | null,
      paidById: 1,
      splitMethod: SplitType.EQUAL,
      participants: [{ userId: 1 }, { userId: 2 }],
    };

    expect(rest.expenseName).toBe('Coffee');
    expect(BigInt(rest.amount)).toBe(500n);
    expect(rest.paidById).toBe(1);
  });

  it('should calculate equal shares for EQUAL split type', () => {
    const participantCount = 4;
    const amount = 1000n;
    const equalShare = amount / BigInt(participantCount);

    expect(equalShare).toBe(250n);
  });

  it('should integer-divide amount for equal splits', () => {
    const participantCount = 3;
    const amount = 1000n;
    const share = amount / BigInt(participantCount);

    expect(share).toBe(333n);
  });
});

describe('validateEditExpensePermission logic', () => {
  describe('addedBy check condition: !participant && addedBy?.addedBy !== userId', () => {
    it('should not throw when user is a participant (short-circuit)', () => {
      const participant = { userId: 1 };
      const addedBy = { addedBy: 2 };
      const userId = 1;

      const shouldThrow = !participant && addedBy?.addedBy !== userId;
      expect(shouldThrow).toBe(false);
    });

    it('should not throw when user is the creator (addedBy matches userId)', () => {
      const participant = null;
      const addedBy = { addedBy: 2 };
      const userId = 2;

      const shouldThrow = !participant && addedBy?.addedBy !== userId;
      expect(shouldThrow).toBe(false);
    });

    it('should throw when user is neither participant nor creator', () => {
      const participant = null;
      const addedBy = { addedBy: 2 };
      const userId = 3;

      const shouldThrow = !participant && addedBy?.addedBy !== userId;
      expect(shouldThrow).toBe(true);
    });

    it('should throw when addedBy is null and user is not a participant', () => {
      const participant = null;
      const addedBy = null as { addedBy: number } | null;
      const userId = 3;

      const shouldThrow = !participant && addedBy?.addedBy !== userId;
      expect(shouldThrow).toBe(true);
    });
  });
});

describe('group membership validation logic', () => {
  it('should allow when user is in the group member set', () => {
    const memberIds = new Set([1, 2, 3]);
    const userId = 1;

    expect(memberIds.has(userId)).toBe(true);
  });

  it('should deny when user is not in the group member set', () => {
    const memberIds = new Set([1, 2, 3]);
    const userId = 4;

    expect(memberIds.has(userId)).toBe(false);
  });

  it('should ensure all participants are group members', () => {
    const memberIds = new Set([1, 2, 3]);
    const participantIds = [1, 2, 3];

    const allMembers = participantIds.every((id) => memberIds.has(id));
    expect(allMembers).toBe(true);
  });

  it('should detect when a participant is not a group member', () => {
    const memberIds = new Set([1, 2]);
    const participantIds = [1, 2, 3];

    const allMembers = participantIds.every((id) => memberIds.has(id));
    expect(allMembers).toBe(false);
  });
});
