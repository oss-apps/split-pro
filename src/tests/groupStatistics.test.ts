import {
  computeMemberTotals,
  currenciesByUse,
  sumInCurrency,
  toFraction,
} from '~/lib/groupStatistics';

const byUserAndCurrency = (totals: ReturnType<typeof computeMemberTotals>) =>
  [...totals].sort((a, b) => a.userId - b.userId || a.currency.localeCompare(b.currency));

describe('computeMemberTotals', () => {
  describe('single expense', () => {
    it('should split an equal expense where the payer participates', () => {
      const totals = computeMemberTotals([
        {
          paidBy: 1,
          currency: 'USD',
          amount: 3000n,
          expenseParticipants: [
            { userId: 1, amount: 2000n },
            { userId: 2, amount: -1000n },
            { userId: 3, amount: -1000n },
          ],
        },
      ]);

      expect(byUserAndCurrency(totals)).toEqual([
        { userId: 1, currency: 'USD', paid: 3000n, share: 1000n },
        { userId: 2, currency: 'USD', paid: 0n, share: 1000n },
        { userId: 3, currency: 'USD', paid: 0n, share: 1000n },
      ]);
    });

    it('should give a zero share to a payer who does not take part', () => {
      const totals = computeMemberTotals([
        {
          paidBy: 1,
          currency: 'USD',
          amount: 1000n,
          expenseParticipants: [
            { userId: 1, amount: 1000n },
            { userId: 2, amount: -1000n },
          ],
        },
      ]);

      expect(byUserAndCurrency(totals)).toEqual([
        { userId: 1, currency: 'USD', paid: 1000n, share: 0n },
        { userId: 2, currency: 'USD', paid: 0n, share: 1000n },
      ]);
    });
  });

  describe('multiple expenses', () => {
    it('should sum expenses per user and keep currencies separate', () => {
      const totals = computeMemberTotals([
        {
          paidBy: 1,
          currency: 'USD',
          amount: 2000n,
          expenseParticipants: [
            { userId: 1, amount: 1000n },
            { userId: 2, amount: -1000n },
          ],
        },
        {
          paidBy: 2,
          currency: 'USD',
          amount: 600n,
          expenseParticipants: [
            { userId: 1, amount: -200n },
            { userId: 2, amount: 200n },
          ],
        },
        {
          paidBy: 2,
          currency: 'EUR',
          amount: 500n,
          expenseParticipants: [
            { userId: 1, amount: -250n },
            { userId: 2, amount: 250n },
          ],
        },
      ]);

      expect(byUserAndCurrency(totals)).toEqual([
        { userId: 1, currency: 'EUR', paid: 0n, share: 250n },
        { userId: 1, currency: 'USD', paid: 2000n, share: 1200n },
        { userId: 2, currency: 'EUR', paid: 500n, share: 250n },
        { userId: 2, currency: 'USD', paid: 600n, share: 1400n },
      ]);
    });
  });
});

describe('toFraction', () => {
  it('should return the share of the total as a fraction', () => {
    expect(toFraction(450n, 1000n)).toBe(0.45);
  });

  it('should round to four decimal places', () => {
    expect(toFraction(1n, 3n)).toBe(0.3333);
  });

  it('should return null for a zero total', () => {
    expect(toFraction(0n, 0n)).toBeNull();
  });
});

describe('sumInCurrency', () => {
  it('should convert other currencies into the target before summing', () => {
    const rates = new Map([['EUR', 1.2]]);
    expect(
      sumInCurrency(
        [
          { currency: 'USD', amount: 1000n },
          { currency: 'EUR', amount: 500n },
        ],
        'USD',
        rates,
      ),
    ).toBe(1600n);
  });

  it('should return null when a rate is missing', () => {
    expect(
      sumInCurrency(
        [
          { currency: 'USD', amount: 1000n },
          { currency: 'EUR', amount: 500n },
        ],
        'USD',
        new Map(),
      ),
    ).toBeNull();
  });
});

describe('currenciesByUse', () => {
  it('should order currencies by number of expenses, then alphabetically', () => {
    expect(
      currenciesByUse([
        { currency: 'USD' },
        { currency: 'GBP' },
        { currency: 'EUR' },
        { currency: 'USD' },
      ]),
    ).toEqual(['USD', 'EUR', 'GBP']);
  });
});
