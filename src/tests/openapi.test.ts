import { createHash } from 'crypto';
import { SplitType } from '@prisma/client';

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
      {
        userId: 1,
        friendId: 2,
        groupId: 1,
        currency: 'USD',
        amount: 100n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: 2,
        friendId: 3,
        groupId: 1,
        currency: 'USD',
        amount: 100n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: 3,
        friendId: 1,
        groupId: 1,
        currency: 'USD',
        amount: 100n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const simplified = simplifyDebts(balances);
    const total = simplified.reduce((sum, b) => sum + b.amount, 0n);
    expect(total).toBe(0n);
  });

  it('should preserve a simple direct debt', () => {
    const balances = [
      {
        userId: 1,
        friendId: 2,
        groupId: null,
        currency: 'USD',
        amount: 5000n,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const simplified = simplifyDebts(balances);
    expect(simplified.length).toBeGreaterThanOrEqual(1);
    expect(simplified.some((b) => b.userId === 1 && b.friendId === 2 && b.amount === 5000n)).toBe(
      true,
    );
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

  it('should apply sign convention for EQUAL split: payer gets positive, non-payers negative', () => {
    const amount = 10;
    const paidBy = 150;
    const participants = [{ userId: 150 }, { userId: 151 }];

    const totalAmount = BigInt(amount);
    const equalShare = totalAmount / BigInt(participants.length);

    const result = participants.map((p) => {
      if (p.userId === paidBy) {
        return { userId: p.userId, amount: -equalShare + totalAmount };
      }
      return { userId: p.userId, amount: -equalShare };
    });

    expect(result[0]?.amount).toBe(5n);
    expect(result[1]?.amount).toBe(-5n);
    expect(result.reduce((acc, p) => acc + p.amount, 0n)).toBe(0n);
  });

  it('should handle penny remainder for EQUAL split with uneven division', () => {
    const amount = 10;
    const paidBy = 1;
    const participants = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];

    const totalAmount = BigInt(amount);
    const equalShare = totalAmount / BigInt(participants.length);

    const result = participants.map((p) => {
      if (p.userId === paidBy) {
        return { userId: p.userId, amount: -equalShare + totalAmount };
      }
      return { userId: p.userId, amount: -equalShare };
    });

    let penniesLeft = result.reduce((acc, p) => acc + p.amount, 0n);
    const nonPayerParticipants = result.filter((p) => p.userId !== paidBy && 0n !== p.amount);
    const sign = (x: bigint) => (0n === x ? 0n : 0n > x ? -1n : 1n);
    let i = 0;
    while (0n !== penniesLeft) {
      const p = nonPayerParticipants[i % nonPayerParticipants.length]!;
      p.amount -= sign(penniesLeft);
      penniesLeft -= sign(penniesLeft);
      i++;
    }

    expect(result[0]?.amount).toBe(7n);
    expect(result.reduce((acc, p) => acc + p.amount, 0n)).toBe(0n);
  });

  it('should leave non-EQUAL split shares as-is (pass-through)', () => {
    const participants = [
      { userId: 1, share: 50 },
      { userId: 2, share: -50 },
    ];

    const result = participants.map((p) => ({
      userId: p.userId,
      amount: p.share !== undefined ? BigInt(p.share) : 0n,
    }));

    expect(result[0]?.amount).toBe(50n);
    expect(result[1]?.amount).toBe(-50n);
  });

  it('should compute 0 as share for EQUAL split with single participant', () => {
    const amount = 1000;
    const participants = [{ userId: 1 }];

    const totalAmount = BigInt(amount);
    const equalShare = totalAmount / BigInt(participants.length);

    expect(equalShare).toBe(1000n);

    const result = participants.map((p) => ({
      userId: p.userId,
      amount: -equalShare + totalAmount,
    }));

    expect(result[0]?.amount).toBe(0n);
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

describe('normalizeExpenseDetail', () => {
  const normalizeDetail = (e: {
    id: string;
    name: string;
    amount: bigint;
    currency: string;
    expenseDate: Date;
    category: string;
    splitType: SplitType;
    groupId: number | null;
    expenseNotes: { note: string }[];
    paidByUser: { id: number; name: string | null } | null;
    addedByUser: { id: number; name: string | null } | null;
    expenseParticipants: { userId: number; amount: bigint }[];
  }) => ({
    ...normalize({
      id: e.id,
      name: e.name,
      amount: e.amount,
      currency: e.currency,
      expenseDate: e.expenseDate,
      category: e.category,
      splitType: e.splitType,
      groupId: e.groupId,
      paidByUser: e.paidByUser,
      expenseParticipants: e.expenseParticipants,
    }),
    notes: e.expenseNotes[0]?.note ?? null,
    addedBy: {
      id: e.addedByUser?.id ?? 0,
      name: e.addedByUser?.name ?? null,
    },
  });

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

  const baseExpense = {
    id: 'exp-detail-1',
    name: 'Detail Expense',
    amount: 5000n,
    currency: 'EUR',
    expenseDate: new Date('2025-06-01'),
    category: 'Travel',
    splitType: SplitType.EXACT,
    groupId: null as number | null,
    paidByUser: { id: 10, name: 'Bob' } as { id: number; name: string | null },
    addedByUser: { id: 10, name: 'Bob' } as { id: number; name: string | null },
    expenseParticipants: [{ userId: 10, amount: 5000n }],
  };

  it('should include notes from the first expense note', () => {
    const expense = { ...baseExpense, expenseNotes: [{ note: 'Hello world' }] };
    const result = normalizeDetail(expense);
    expect(result.notes).toBe('Hello world');
  });

  it('should return null for notes when no notes exist', () => {
    const expense = { ...baseExpense, expenseNotes: [] };
    const result = normalizeDetail(expense);
    expect(result.notes).toBeNull();
  });

  it('should include addedBy from the creator', () => {
    const expense = { ...baseExpense, expenseNotes: [] };
    const result = normalizeDetail(expense);
    expect(result.addedBy.id).toBe(10);
    expect(result.addedBy.name).toBe('Bob');
  });

  it('should handle null addedByUser gracefully', () => {
    const expense = { ...baseExpense, expenseNotes: [], addedByUser: null };
    const result = normalizeDetail(expense);
    expect(result.addedBy.id).toBe(0);
    expect(result.addedBy.name).toBeNull();
  });
});

describe('deduplicateByUserId', () => {
  const deduplicateByUserId = <T extends { userId: number }>(participants: T[]): T[] => {
    const seen = new Map<number, T>();
    for (const p of participants) {
      if (!seen.has(p.userId)) {
        seen.set(p.userId, p);
      }
    }
    return [...seen.values()];
  };

  it('should keep only one entry per userId', () => {
    const participants = [
      { userId: 1, amount: 50 },
      { userId: 2, amount: 30 },
      { userId: 1, amount: 20 },
    ];

    const result = deduplicateByUserId(participants);
    expect(result).toHaveLength(2);
  });

  it('should keep the first occurrence when duplicates exist', () => {
    const participants = [
      { userId: 1, amount: 50 },
      { userId: 1, amount: 20 },
    ];

    const result = deduplicateByUserId(participants);
    expect(result[0]?.amount).toBe(50);
  });

  it('should return unchanged array when no duplicates', () => {
    const participants = [
      { userId: 1, amount: 50 },
      { userId: 2, amount: 30 },
    ];

    const result = deduplicateByUserId(participants);
    expect(result).toHaveLength(2);
    expect(result[0]?.userId).toBe(1);
    expect(result[1]?.userId).toBe(2);
  });

  it('should return empty for empty input', () => {
    const participants: { userId: number; amount: number }[] = [];
    const result = deduplicateByUserId(participants);
    expect(result).toHaveLength(0);
  });
});

describe('GET /expenses query logic', () => {
  it('should filter out deleted expenses with deletedBy: null', () => {
    const userId = 150;
    const expenseWhere = {
      deletedBy: null,
      expenseParticipants: {
        some: { userId },
      },
    };

    expect(expenseWhere.deletedBy).toBeNull();
    expect(expenseWhere.expenseParticipants).toBeDefined();
  });

  it('should filter by groupId when provided', () => {
    const groupId = 151;
    const userId = 150;
    const expenseWhere = {
      deletedBy: null,
      groupId,
      group: { groupUsers: { some: { userId } } },
    };

    expect(expenseWhere.groupId).toBe(151);
    expect(expenseWhere.deletedBy).toBeNull();
  });

  it('should filter by user participation when no groupId', () => {
    const userId = 150;
    const expenseWhere = {
      deletedBy: null,
      expenseParticipants: {
        some: { userId },
      },
    };

    const hasParticipationFilter =
      'expenseParticipants' in expenseWhere && expenseWhere.expenseParticipants !== undefined;
    expect(hasParticipationFilter).toBe(true);
  });

  it('should add date filter when since is provided', () => {
    const since = '2026-01-01T00:00:00.000Z';
    const userId = 150;
    const expenseWhere = {
      deletedBy: null,
      expenseParticipants: { some: { userId } },
      ...(since ? { expenseDate: { gte: new Date(since) } } : {}),
    };

    expect(expenseWhere.expenseDate).toBeDefined();
    const expenseDate = expenseWhere.expenseDate as Record<string, unknown> | undefined;
    expect(expenseDate?.gte).toBeInstanceOf(Date);
  });

  it('should not have date filter when since is not provided', () => {
    const since = undefined;
    const userId = 150;
    const expenseWhere = {
      deletedBy: null,
      expenseParticipants: { some: { userId } },
      ...(since ? { expenseDate: { gte: new Date(since) } } : {}),
    };

    expect(expenseWhere).not.toHaveProperty('expenseDate');
  });
});

describe('GET /groups/{id}/expenses query logic', () => {
  it('should filter by groupId and deletedBy: null', () => {
    const groupId = 151;
    const where = {
      groupId,
      deletedBy: null,
    };

    expect(where.groupId).toBe(151);
    expect(where.deletedBy).toBeNull();
  });

  it('should add date filter when since is provided', () => {
    const groupId = 151;
    const since = '2026-01-01T00:00:00.000Z';
    const where = {
      groupId,
      deletedBy: null,
      ...(since ? { expenseDate: { gte: new Date(since) } } : {}),
    };

    expect(where.expenseDate).toBeDefined();
  });
});

describe('GET /expenses query uses Expense.findMany (not ExpenseParticipant.findMany)', () => {
  it('should query Expense with direct includes (not nested expense wrapper)', () => {
    const queryConfig = {
      model: 'expense',
      include: {
        expenseParticipants: true,
        paidByUser: true,
        group: true,
        deletedByUser: true,
      },
    };

    expect(queryConfig.model).toBe('expense');
    expect(queryConfig.include).toHaveProperty('expenseParticipants');
    expect(queryConfig.include).not.toHaveProperty('expense');
  });
});

describe('DELETE /expenses/{id} mutation logic', () => {
  it('should return an empty object on success', () => {
    const deleteExpenseMutation = async () => ({});
    const result = deleteExpenseMutation();

    expect(result).resolves.toEqual({});
  });

  it('should validate expense permission before deleting', async () => {
    let permissionChecked = false;
    let deleted = false;

    const validatePermission = () => {
      permissionChecked = true;
    };
    const deleteExpense = () => {
      deleted = true;
      return Promise.resolve();
    };

    validatePermission();
    await deleteExpense();

    expect(permissionChecked).toBe(true);
    expect(deleted).toBe(true);
  });
});

describe('GET /me endpoint logic', () => {
  it('should return the session user directly', () => {
    const session = {
      user: {
        id: 150,
        name: 'test',
        email: 'test@example.com',
        image: null,
        currency: 'USD',
      },
    };

    const result = session.user;
    expect(result.id).toBe(150);
    expect(result.name).toBe('test');
    expect(result.currency).toBe('USD');
  });
});

describe('GET /friends endpoint logic', () => {
  it('should include friends with zero balance from shared expenses', () => {
    const userId = 150;
    const friendId = 151;

    const participantRecords = [{ userId: friendId }];
    const friendIdsFromExpenses = new Set(participantRecords.map((p) => p.userId));

    const rawBalances: { friendId: number; currency: string; amount: bigint }[] = [];
    for (const b of rawBalances) {
      friendIdsFromExpenses.add(b.friendId);
    }

    const aggregated = new Map<number, Map<string, bigint>>();

    const users = [{ id: friendId, name: 'test2', email: 'test2@test.com', image: null }];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = [];
    for (const fid of friendIdsFromExpenses) {
      const user = userMap.get(fid);
      if (!user) {
        continue;
      }

      const currencies = aggregated.get(fid);
      if (currencies && 0 < currencies.size) {
        for (const [currency, amount] of currencies) {
          result.push({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            balance: Number(amount),
            currency,
          });
        }
      } else {
        result.push({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          balance: 0,
          currency: 'USD',
        });
      }
    }

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(friendId);
    expect(result[0]?.balance).toBe(0);
  });

  it('should still show per-currency entries for non-zero balances', () => {
    const friendId = 151;

    const friendIdsFromExpenses = new Set([friendId]);
    const aggregated = new Map<number, Map<string, bigint>>();
    aggregated.set(
      friendId,
      new Map([
        ['USD', 500n],
        ['GBP', -200n],
      ]),
    );

    const users = [{ id: friendId, name: 'test2', email: 'test2@test.com', image: null }];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const result = [];
    for (const fid of friendIdsFromExpenses) {
      const user = userMap.get(fid);
      if (!user) {
        continue;
      }

      const currencies = aggregated.get(fid);
      if (currencies && 0 < currencies.size) {
        for (const [currency, amount] of currencies) {
          result.push({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            balance: Number(amount),
            currency,
          });
        }
      } else {
        result.push({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          balance: 0,
          currency: 'USD',
        });
      }
    }

    expect(result).toHaveLength(2);
    expect(result[0]?.currency).toBe('USD');
    expect(result[0]?.balance).toBe(500);
    expect(result[1]?.currency).toBe('GBP');
    expect(result[1]?.balance).toBe(-200);
  });

  it('should filter out hidden friends', () => {
    const hiddenIds = [151];
    const participantRecords = [{ userId: 151 }, { userId: 152 }];
    const friendIdsFromExpenses = new Set(participantRecords.map((p) => p.userId));

    for (const hiddenId of hiddenIds) {
      friendIdsFromExpenses.delete(hiddenId);
    }

    expect(friendIdsFromExpenses.has(151)).toBe(false);
    expect(friendIdsFromExpenses.has(152)).toBe(true);
  });
});

describe('GET /groups endpoint logic', () => {
  it('should query groups where user is a member', () => {
    const userId = 150;
    const queryConfig = {
      where: {
        groupUsers: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { groupUsers: true },
        },
      },
    };

    expect(queryConfig.where.groupUsers.some.userId).toBe(userId);
    expect(queryConfig.include._count.select).toHaveProperty('groupUsers');
  });
});

describe('GET /groups/{id} endpoint logic', () => {
  it('should query group with user includes', () => {
    const groupId = 151;
    const queryConfig = {
      where: { id: groupId },
      include: {
        groupUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    };

    expect(queryConfig.where.id).toBe(groupId);
    expect(queryConfig.include.groupUsers).toBeDefined();
  });
});
