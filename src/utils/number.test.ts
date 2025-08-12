// filepath: /home/wiktor/kod/split-pro/src/utils/number.test.ts
import { toUIString, calculateExactRemainderDistribution } from './numbers';
import type { CurrencyCode } from '../lib/currency';

describe('toUIString', () => {
  describe('USD currency (2 decimal places)', () => {
    const currencyCode: CurrencyCode = 'USD';
    const toUIStringUnsigned = (val: bigint) => toUIString(val, false, currencyCode);
    const toUIStringSigned = (val: bigint) => toUIString(val, true, currencyCode);

    it.each([
      [12300n, '123.00'],
      [12345n, '123.45'],
      [50n, '0.50'],
      [5n, '0.05'],
      [0n, '0.00'],
    ])('should format unsigned %p as %p', (value, expected) => {
      expect(toUIStringUnsigned(value)).toBe(expected);
    });

    it.each([
      [12345n, '123.45'],
      [-12345n, '-123.45'],
      [-50n, '-0.50'],
      [-0n, '0.00'],
    ])('should format signed %p as %p', (value, expected) => {
      expect(toUIStringSigned(value)).toBe(expected);
    });

    it('should ignore sign if signed parameter is false', () => {
      expect(toUIStringUnsigned(-12345n)).toBe('123.45');
    });
  });

  describe('AFN currency (0 decimal places)', () => {
    const currencyCode: CurrencyCode = 'AFN';
    const toUIStringUnsigned = (val: bigint) => toUIString(val, false, currencyCode);
    const toUIStringSigned = (val: bigint) => toUIString(val, true, currencyCode);

    it.each([
      [12300n, '123'],
      [12345n, '123'],
      [12399n, '123'],
      [50n, '0'],
      [5n, '0'],
      [99n, '0'],
      [0n, '0'],
    ])('should format unsigned %p as %p', (value, expected) => {
      expect(toUIStringUnsigned(value)).toBe(expected);
    });

    it.each([
      [12300n, '123'],
      [-12300n, '-123'],
      [-700n, '-7'],
      [-50n, '0'],
      [-0n, '0'],
    ])('should format signed %p as %p', (value, expected) => {
      expect(toUIStringSigned(value)).toBe(expected);
    });

    it('should ignore sign if signed parameter is false for AFN', () => {
      expect(toUIStringUnsigned(-12300n)).toBe('123');
    });
  });

  it('should use USD as default currency if none provided', () => {
    expect(toUIString(12345n)).toBe('123.45');
  });

  it('should default to absolute value if signed parameter is undefined', () => {
    expect(toUIString(-12345n, undefined, 'USD')).toBe('123.45');
  });

  describe('Locale-specific formatting', () => {
    it('should format with thousands separators (commas) and dot decimal for default en-US locale', () => {
      const value = 12345678900n;
      const currencyCode: CurrencyCode = 'USD';
      expect(toUIString(value, false, currencyCode)).toBe('123,456,789.00');
    });

    it('should format with thousands separators for a currency with 0 decimal places (e.g., JPY/AFN)', () => {
      const value = 123456700n;
      const currencyCode: CurrencyCode = 'AFN';
      expect(toUIString(value, false, currencyCode)).toBe('1,234,567');
    });

    it('should handle negative numbers with locale-specific formatting', () => {
      const value = -12345678900n;
      const currencyCode: CurrencyCode = 'USD';
      expect(toUIString(value, true, currencyCode)).toBe('-123,456,789.00');
    });
  });
});

describe('calculateExactRemainderDistribution', () => {
  it('should distribute remainder equally among all participants, including those with 0 current amount', () => {
    const participants = [
      { id: 1 },
      { id: 2 },
    ];
    const splitShares = {
      1: { EXACT: 0n }, // person a has 0 EUR
      2: { EXACT: 2500n }, // person b has 25 EUR
    };
    const remainder = 2200n; // 22 EUR remaining

    const result = calculateExactRemainderDistribution(participants, splitShares, remainder);
    
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        participantId: 1,
        currentAmount: 0n,
        addedAmount: 1100n, // 11 EUR (22/2)
        finalAmount: 1100n,
      },
      {
        participantId: 2, 
        currentAmount: 2500n,
        addedAmount: 1100n, // 11 EUR (22/2)
        finalAmount: 3600n, // 25 + 11 = 36 EUR
      },
    ]);
  });

  it('should handle uneven remainder distribution', () => {
    const participants = [
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ];
    const splitShares = {
      1: { EXACT: 0n },
      2: { EXACT: 1000n }, 
      3: { EXACT: 500n },
    };
    const remainder = 1000n; // 10 EUR remaining

    const result = calculateExactRemainderDistribution(participants, splitShares, remainder);
    
    expect(result).toHaveLength(3);
    
    // 10 EUR / 3 participants = 3.33... EUR each, so 2 get 3.34 and 1 gets 3.33
    const addedAmounts = result.map(r => r.addedAmount).sort();
    expect(addedAmounts).toEqual([333n, 333n, 334n]); // 3.33, 3.33, 3.34 EUR
  });

  it('should return empty array when remainder is 0 or negative', () => {
    const participants = [{ id: 1 }, { id: 2 }];
    const splitShares = { 1: { EXACT: 1000n }, 2: { EXACT: 1000n } };

    expect(calculateExactRemainderDistribution(participants, splitShares, 0n)).toEqual([]);
    expect(calculateExactRemainderDistribution(participants, splitShares, -100n)).toEqual([]);
  });
});
