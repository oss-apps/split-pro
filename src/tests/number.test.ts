// Filepath: /home/wiktor/kod/split-pro/src/utils/number.test.ts
import { currencyConversion, getCurrencyHelpers } from '../utils/numbers';

describe('getCurrencyHelpers', () => {
  describe('toUIString', () => {
    describe('en-US locale', () => {
      const locale = 'en-US';

      describe('USD', () => {
        const currency = 'USD';
        const { toUIString } = getCurrencyHelpers({ locale, currency });

        it.each([
          [12345n, '$123.45'],
          [-12345n, '$123.45'],
          [-50n, '$0.5'],
          [-0n, '$0'],
          [99999999999999999999999999999n, '$999,999,999,999,999,999,999,999,999.99'],
          [-99999999999999999999999999999n, '$999,999,999,999,999,999,999,999,999.99'],
        ])('should format %p as %p ', (value, expected) => {
          expect(toUIString(value)).toBe(expected);
        });

        it('should format with thousands separators for large numbers', () => {
          const value = 12345678900n;
          expect(toUIString(value)).toBe('$123,456,789');
        });

        it('should insert thousands separators for single ~1k values', () => {
          const value = 123400n;
          expect(toUIString(value)).toBe('$1,234');
        });

        it.each([
          [12345n, '$123.45'],
          [-12345n, '-$123.45'],
          [-50n, '-$0.5'],
          [-0n, '$0'],
          [99999999999999999999999999999n, '$999,999,999,999,999,999,999,999,999.99'],
          [-99999999999999999999999999999n, '-$999,999,999,999,999,999,999,999,999.99'],
        ])('should format %p as %p with signed flag', (value, expected) => {
          expect(toUIString(value, true)).toBe(expected);
        });
      });
      describe('JPY (no decimals)', () => {
        const currency = 'JPY';

        const { toUIString } = getCurrencyHelpers({ locale, currency });

        it.each([
          [12345n, '¥12,345'],
          [-12345n, '¥12,345'],
          [-50n, '¥50'],
          [-0n, '¥0'],
        ])('should format %p as %p ', (value, expected) => {
          expect(toUIString(value)).toBe(expected);
        });
      });
    });

    describe('bg-BG locale', () => {
      const locale = 'bg-BG';

      describe('EUR', () => {
        const currency = 'EUR';

        const { toUIString } = getCurrencyHelpers({ locale, currency });

        it.each([
          [12345n, '123,45 €'],
          [-12345n, '123,45 €'],
          [-50n, '0,5 €'],
          [-0n, '0 €'],
        ])('should format %p as %p ', (value, expected) => {
          expect(toUIString(value)).toBe(expected);
        });

        it('should format with thousands separators for large numbers', () => {
          expect(toUIString(12345678900n)).toBe('123 456 789 €');
          expect(toUIString(5678900n)).toBe('56 789 €');
        });

        it('should not insert thousands separators for single ~1k values', () => {
          const value = 123400n;
          expect(toUIString(value)).toBe('1234 €');
        });
      });
    });
  });

  describe('toSafeBigInt', () => {
    const { toSafeBigInt } = getCurrencyHelpers({
      locale: 'en-US',
      currency: 'USD',
    });

    it.each([
      ['123.45', 12345n],
      ['0.99', 99n],
      ['1000', 100000n],
      ['1000.5', 100050n],
      ['0', 0n],
      ['', 0n],
      ['invalid', 0n],
      [123.45, 12345n],
      [0.99, 99n],
      [1000, 100000n],
      [1000.5, 100050n],
      [NaN, 0n],
      [0, 0n],
      [12345n, 12345n],
      [0n, 0n],
    ])('should parse %p to %p ', (input, expected) => {
      expect(toSafeBigInt(input)).toBe(expected);
    });

    it.each([
      ['-123.45', -12345n],
      ['-0.99', -99n],
      ['-100.01', -10001n],
      ['-1000', -100000n],
      ['-1000.5', -100050n],

      [-123.45, -12345n],
      [-0.99, -99n],
      [-1000, -100000n],
      [-1000.5, -100050n],
    ])('should parse %p to %p with signed flag', (input, expected) => {
      expect(toSafeBigInt(input, true)).toBe(expected);
    });

    it.each([
      ['123456789012345678901234567890.12', 12345678901234567890123456789012n],
      ['0.000000000000000000000000000001', 0n],
      ['-123456789012345678901234567890.12', -12345678901234567890123456789012n],
    ])('should parse big numbers %p to %p ', (input, expected) => {
      expect(toSafeBigInt(input, true)).toBe(expected);
    });
  });

  describe('sanitizeInput', () => {
    const { sanitizeInput } = getCurrencyHelpers({
      locale: 'en-US',
      currency: 'USD',
    });

    it.each([
      ['123.45', '123.45'],
      ['1,234.56', '1234.56'],
      ['1,234.56789', '1234.56'],
      ['$1,234.56', '1234.56'],
      ['$1,234.56789', '1234.56'],
      ['-123.45', '123.45'],
      ['abc123.45xyz', '123.45'],
      ['..123..45..', '.12'],
      ['', ''],
    ])('should sanitize %p to %p', (input, expected) => {
      expect(sanitizeInput(input, false)).toBe(expected);
    });

    it.each([
      ['-123.45', '-123.45'],
      ['(-123.45)', '-123.45'],
      ['-$1,234.56', '-1234.56'],
      ['abc-123.45xyz', '-123.45'],
      ['--123.45', '-123.45'],
    ])('should sanitize %p to %p with signed flag', (input, expected) => {
      expect(sanitizeInput(input, true)).toBe(expected);
    });
  });
});

describe('currencyConversion', () => {
  it('handles increasing decimal digit conversions', () => {
    const from = 'JPY'; // 0 decimal digits
    const to = 'USD';
    const amount = 12345n; // 12345 JPY
    const rate = 0.0073; // 1 JPY = 0.0073 USD

    const res = currencyConversion({ from, to, amount, rate });

    // 12345 JPY * 0.0073 = 90.1185 USD -> rounded to 90.12 USD -> 9012 in bigint
    expect(res).toBe(9012n);
  });

  it('handles decreasing decimal digit conversions', () => {
    const from = 'USD'; // 2 decimal digits
    const to = 'JPY';
    const amount = 9012n;
    const rate = 1 / 0.0073;

    const res = currencyConversion({ from, to, amount, rate });

    expect(res).toBe(12345n);
  });
});
