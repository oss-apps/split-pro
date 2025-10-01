// filepath: /home/wiktor/kod/split-pro/src/utils/number.test.ts
import { toUIString } from './numbers';
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

const { toSafeBigInt } = require('./numbers');

describe('toSafeBigInt (minimal current behavior)', () => {
  it.each([
    ['integer positive', '100', 10000n],
    ['integer negative', '-100', -10000n],
    ['decimal positive', '100.25', 10025n],
    ['decimal negative', '-100.25', -10025n],
    ['small decimal positive rounding', '1.005', 101n],
  ])('%s: %s -> %s', (_label, input, expected) => {
    expect(toSafeBigInt(input)).toBe(expected);
  });

  it.each([
    ['empty string', '', 0n],
    ['letters', 'abc', 0n],
  ])('invalid input %s -> 0n', (_label, input, expected) => {
    expect(toSafeBigInt(input)).toBe(expected);
  });

  it('negative zero decimal becomes +1 cent with current logic', () => {
    expect(toSafeBigInt('-0.01')).toBe(-1n);
  });
});
