import { SplitType } from '@prisma/client';
import {
  calculateParticipantAmount,
  convertExpenseToSplitPro,
  determineSplitType,
  mapCategory,
} from '~/lib/splitwise-converter';
import { type SplitwiseExpense } from '~/lib/splitwise-api';

// Suppress console.warn during tests (we're testing error cases intentionally)
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ============= TEST HELPERS =============

/**
 * Create a mock Splitwise expense for testing
 */
function createMockExpense(overrides: Partial<SplitwiseExpense> = {}): SplitwiseExpense {
  return {
    id: 1,
    cost: '100.00',
    description: 'Test Expense',
    details: null,
    date: '2024-01-15T12:00:00Z',
    currency_code: 'INR',
    category: { id: 1, name: 'General' },
    group_id: 1,
    friendship_id: null,
    expense_bundle_id: null,
    repeats: false,
    repeat_interval: null,
    email_reminder: false,
    email_reminder_in_advance: null,
    next_repeat: null,
    comments_count: 0,
    payment: false,
    transaction_confirmed: true,
    created_at: '2024-01-15T12:00:00Z',
    created_by: { id: 1, first_name: 'Test', last_name: 'User' },
    updated_at: '2024-01-15T12:00:00Z',
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    users: [
      {
        user_id: 101,
        user: {
          id: 101,
          first_name: 'Alice',
          last_name: 'Smith',
          email: 'alice@example.com',
        },
        paid_share: '100.00',
        owed_share: '50.00',
        net_balance: '50.00',
      },
      {
        user_id: 102,
        user: {
          id: 102,
          first_name: 'Bob',
          last_name: 'Jones',
          email: 'bob@example.com',
        },
        paid_share: '0.00',
        owed_share: '50.00',
        net_balance: '-50.00',
      },
    ],
    repayments: [],
    ...overrides,
  };
}

/**
 * Create a standard user mapping for tests
 */
function createUserMapping(): Map<number, number> {
  const map = new Map<number, number>();
  map.set(101, 1); // Splitwise ID 101 -> DB ID 1
  map.set(102, 2); // Splitwise ID 102 -> DB ID 2
  map.set(103, 3); // Splitwise ID 103 -> DB ID 3
  return map;
}

// ============= TESTS =============

describe('convertExpenseToSplitPro', () => {
  describe('basic conversion', () => {
    it('converts a simple two-person equal split expense', () => {
      const expense = createMockExpense();
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Expense');
      expect(result!.amount).toBe(10000n); // 100.00 * 100 = 10000 paisa
      expect(result!.currency).toBe('INR');
      expect(result!.groupId).toBe(10);
      expect(result!.paidBy).toBe(1); // Alice (DB ID 1)
      expect(result!.transactionId).toBe('splitwise-api-1');
    });

    it('calculates participant amounts correctly for equal split', () => {
      // Alice paid 100, split equally (50 each)
      // Alice: paid 100, owes 50 -> amount = 100 - 50 = +50 (is owed)
      // Bob: paid 0, owes 50 -> amount = 0 - 50 = -50 (owes)
      const expense = createMockExpense();
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.participants).toHaveLength(2);

      const aliceParticipant = result!.participants.find((p) => p.userId === 1);
      const bobParticipant = result!.participants.find((p) => p.userId === 2);

      expect(aliceParticipant!.amount).toBe(5000n); // +50.00 (is owed)
      expect(bobParticipant!.amount).toBe(-5000n); // -50.00 (owes)
    });

    it('handles three-way equal split', () => {
      const expense = createMockExpense({
        cost: '300.00',
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '300.00',
            owed_share: '100.00',
            net_balance: '200.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '100.00',
            net_balance: '-100.00',
          },
          {
            user_id: 103,
            user: { id: 103, first_name: 'Charlie', last_name: null, email: 'charlie@example.com' },
            paid_share: '0.00',
            owed_share: '100.00',
            net_balance: '-100.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.participants).toHaveLength(3);
      expect(result!.amount).toBe(30000n);

      const alice = result!.participants.find((p) => p.userId === 1);
      const bob = result!.participants.find((p) => p.userId === 2);
      const charlie = result!.participants.find((p) => p.userId === 3);

      expect(alice!.amount).toBe(20000n); // +200 (paid 300, owes 100)
      expect(bob!.amount).toBe(-10000n); // -100
      expect(charlie!.amount).toBe(-10000n); // -100
    });
  });

  describe('unequal splits', () => {
    it('handles unequal split correctly', () => {
      // Alice paid 100, Alice owes 30, Bob owes 70
      const expense = createMockExpense({
        cost: '100.00',
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '100.00',
            owed_share: '30.00',
            net_balance: '70.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '70.00',
            net_balance: '-70.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      const alice = result!.participants.find((p) => p.userId === 1);
      const bob = result!.participants.find((p) => p.userId === 2);

      expect(alice!.amount).toBe(7000n); // +70 (paid 100, owes 30)
      expect(bob!.amount).toBe(-7000n); // -70
    });
  });

  describe('settlements/payments', () => {
    it('converts settlement expense correctly', () => {
      // Bob pays Alice 50 (settling a debt)
      const expense = createMockExpense({
        description: 'Payment',
        cost: '50.00',
        payment: true,
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '50.00',
            owed_share: '0.00',
            net_balance: '50.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.splitType).toBe(SplitType.SETTLEMENT);
      expect(result!.paidBy).toBe(2); // Bob paid

      const alice = result!.participants.find((p) => p.userId === 1);
      const bob = result!.participants.find((p) => p.userId === 2);

      expect(alice!.amount).toBe(-5000n); // Alice received payment (owes less now)
      expect(bob!.amount).toBe(5000n); // Bob made payment (is owed now)
    });
  });

  describe('edge cases', () => {
    it('returns null when no payer is found', () => {
      const expense = createMockExpense({
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result).toBeNull();
    });

    it('returns null when payer not in user map', () => {
      const expense = createMockExpense({
        users: [
          {
            user_id: 999, // Not in user map
            user: { id: 999, first_name: 'Unknown', last_name: null, email: 'unknown@example.com' },
            paid_share: '100.00',
            owed_share: '50.00',
            net_balance: '50.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result).toBeNull();
    });

    it('skips participants with zero amounts', () => {
      // User 103 has zero owed_share and zero paid_share
      const expense = createMockExpense({
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '100.00',
            owed_share: '50.00',
            net_balance: '50.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
          {
            user_id: 103,
            user: { id: 103, first_name: 'Charlie', last_name: null, email: 'charlie@example.com' },
            paid_share: '0.00',
            owed_share: '0.00',
            net_balance: '0.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.participants).toHaveLength(2);
      expect(result!.participants.find((p) => p.userId === 3)).toBeUndefined();
    });

    it('handles missing description', () => {
      const expense = createMockExpense({ description: '' });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.name).toBe('Untitled expense');
    });

    it('handles decimal amounts correctly (avoids floating point issues)', () => {
      const expense = createMockExpense({
        cost: '33.33',
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '33.33',
            owed_share: '11.11',
            net_balance: '22.22',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '11.11',
            net_balance: '-11.11',
          },
          {
            user_id: 103,
            user: { id: 103, first_name: 'Charlie', last_name: null, email: 'charlie@example.com' },
            paid_share: '0.00',
            owed_share: '11.11',
            net_balance: '-11.11',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      expect(result!.amount).toBe(3333n);

      const alice = result!.participants.find((p) => p.userId === 1);
      const bob = result!.participants.find((p) => p.userId === 2);
      const charlie = result!.participants.find((p) => p.userId === 3);

      expect(alice!.amount).toBe(2222n);
      expect(bob!.amount).toBe(-1111n);
      expect(charlie!.amount).toBe(-1111n);
    });
  });

  describe('balance verification', () => {
    it('participant amounts sum to zero', () => {
      const expense = createMockExpense();
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      const sum = result!.participants.reduce((acc, p) => acc + p.amount, 0n);
      expect(sum).toBe(0n);
    });

    it('participant amounts sum to zero for three-way split', () => {
      const expense = createMockExpense({
        cost: '300.00',
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '300.00',
            owed_share: '100.00',
            net_balance: '200.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '0.00',
            owed_share: '100.00',
            net_balance: '-100.00',
          },
          {
            user_id: 103,
            user: { id: 103, first_name: 'Charlie', last_name: null, email: 'charlie@example.com' },
            paid_share: '0.00',
            owed_share: '100.00',
            net_balance: '-100.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      const sum = result!.participants.reduce((acc, p) => acc + p.amount, 0n);
      expect(sum).toBe(0n);
    });

    it('participant amounts sum to zero for settlement', () => {
      const expense = createMockExpense({
        payment: true,
        cost: '50.00',
        users: [
          {
            user_id: 101,
            user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
            paid_share: '0.00',
            owed_share: '50.00',
            net_balance: '-50.00',
          },
          {
            user_id: 102,
            user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
            paid_share: '50.00',
            owed_share: '0.00',
            net_balance: '50.00',
          },
        ],
      });
      const userMap = createUserMapping();

      const result = convertExpenseToSplitPro(expense, userMap, 10);

      const sum = result!.participants.reduce((acc, p) => acc + p.amount, 0n);
      expect(sum).toBe(0n);
    });
  });
});

describe('determineSplitType', () => {
  it('returns SETTLEMENT for payment expenses', () => {
    const expense = createMockExpense({ payment: true });
    expect(determineSplitType(expense)).toBe(SplitType.SETTLEMENT);
  });

  it('returns EQUAL for equal splits', () => {
    const expense = createMockExpense({
      users: [
        {
          user_id: 101,
          user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
          paid_share: '100.00',
          owed_share: '50.00',
          net_balance: '50.00',
        },
        {
          user_id: 102,
          user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
          paid_share: '0.00',
          owed_share: '50.00',
          net_balance: '-50.00',
        },
      ],
    });
    expect(determineSplitType(expense)).toBe(SplitType.EQUAL);
  });

  it('returns EXACT for unequal splits', () => {
    const expense = createMockExpense({
      users: [
        {
          user_id: 101,
          user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
          paid_share: '100.00',
          owed_share: '30.00',
          net_balance: '70.00',
        },
        {
          user_id: 102,
          user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
          paid_share: '0.00',
          owed_share: '70.00',
          net_balance: '-70.00',
        },
      ],
    });
    expect(determineSplitType(expense)).toBe(SplitType.EXACT);
  });

  it('returns EXACT when only one person owes', () => {
    const expense = createMockExpense({
      users: [
        {
          user_id: 101,
          user: { id: 101, first_name: 'Alice', last_name: null, email: 'alice@example.com' },
          paid_share: '100.00',
          owed_share: '0.00',
          net_balance: '100.00',
        },
        {
          user_id: 102,
          user: { id: 102, first_name: 'Bob', last_name: null, email: 'bob@example.com' },
          paid_share: '0.00',
          owed_share: '100.00',
          net_balance: '-100.00',
        },
      ],
    });
    expect(determineSplitType(expense)).toBe(SplitType.EXACT);
  });
});

describe('mapCategory', () => {
  it('maps food-related categories to food', () => {
    expect(mapCategory('groceries')).toBe('food');
    expect(mapCategory('dining out')).toBe('food');
    expect(mapCategory('food')).toBe('food');
    expect(mapCategory('drinks')).toBe('food');
    expect(mapCategory('liquor')).toBe('food');
  });

  it('maps home-related categories to home', () => {
    expect(mapCategory('rent')).toBe('home');
    expect(mapCategory('mortgage')).toBe('home');
    expect(mapCategory('household')).toBe('home');
    expect(mapCategory('furniture')).toBe('home');
    expect(mapCategory('electronics')).toBe('home');
  });

  it('maps utility categories to utilities', () => {
    expect(mapCategory('utilities')).toBe('utilities');
    expect(mapCategory('electricity')).toBe('utilities');
    expect(mapCategory('water')).toBe('utilities');
    expect(mapCategory('internet')).toBe('utilities');
  });

  it('maps transportation categories to transportation', () => {
    expect(mapCategory('transportation')).toBe('transportation');
    expect(mapCategory('parking')).toBe('transportation');
    expect(mapCategory('taxi')).toBe('transportation');
    expect(mapCategory('gas')).toBe('transportation');
  });

  it('maps entertainment categories to entertainment', () => {
    expect(mapCategory('entertainment')).toBe('entertainment');
    expect(mapCategory('games')).toBe('entertainment');
    expect(mapCategory('movies')).toBe('entertainment');
    expect(mapCategory('music')).toBe('entertainment');
  });

  it('maps personal categories to personal', () => {
    expect(mapCategory('clothing')).toBe('personal');
    expect(mapCategory('gifts')).toBe('personal');
    expect(mapCategory('medical')).toBe('personal');
    expect(mapCategory('insurance')).toBe('personal');
  });

  it('returns general for unknown categories', () => {
    expect(mapCategory('unknown')).toBe('general');
    expect(mapCategory('random')).toBe('general');
    expect(mapCategory('xyz')).toBe('general');
  });

  it('handles case-insensitive input', () => {
    expect(mapCategory('GROCERIES')).toBe('food');
    expect(mapCategory('Rent')).toBe('home');
    expect(mapCategory('ENTERTAINMENT')).toBe('entertainment');
  });
});

describe('calculateParticipantAmount', () => {
  it('returns positive amount when paid more than owed', () => {
    // Paid 100, owes 30 -> +70
    const amount = calculateParticipantAmount(100, 30);
    expect(amount).toBe(7000n);
  });

  it('returns negative amount when owed more than paid', () => {
    // Paid 0, owes 50 -> -50
    const amount = calculateParticipantAmount(0, 50);
    expect(amount).toBe(-5000n);
  });

  it('returns zero when paid equals owed', () => {
    const amount = calculateParticipantAmount(50, 50);
    expect(amount).toBe(0n);
  });

  it('handles decimal values correctly', () => {
    const amount = calculateParticipantAmount(33.33, 11.11);
    expect(amount).toBe(2222n);
  });
});
