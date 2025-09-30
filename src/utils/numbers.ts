import { CURRENCIES, type CurrencyCode } from '~/lib/currency';

export function toSafeBigInt(num: number | string) {
  if ('number' === typeof num) {
    return BigInt(Math.round(num * 100));
  } else if ('string' === typeof num) {
    if ('' === num.trim()) {
      return 0n;
    }
    const parsed = parseFloat(num);
    if (isNaN(parsed)) {
      return 0n;
    }
    // Normalize decimal separator and extract sign
    const numUnified = num.replace(',', '.').trim();
    const negative = numUnified.startsWith('-');
    const unsigned = negative ? numUnified.slice(1) : numUnified;

    const parts = unsigned.split('.');
    const wholePartStr = parts[0] ?? '0';
    // Handle edge inputs like ".50" or "-.50"
    const whole = '' === wholePartStr ? 0n : BigInt(wholePartStr);
    const fractionStr = parts[1] ?? '0';
    // We round to 2 decimal places (cents) to stay consistent with currency storage
    const fraction = BigInt(Math.round(parseFloat(`0.${fractionStr}`) * 100));

    const value = whole * 100n + fraction;
    return negative ? -value : value;
  } else {
    return 0n;
  }
}

export function toUIString(num = 0n, signed = false, currencyCode: CurrencyCode = 'USD') {
  const { decimalDigits } = CURRENCIES[currencyCode];
  const maxDecimals = 10n ** BigInt(decimalDigits);
  const decimalPart = num % 100n;
  const wholePart = BigMath.abs(num) / 100n;
  const res =
    wholePart.toLocaleString(undefined, {
      maximumFractionDigits: 0,
    }) +
    (0 < decimalDigits
      ? (Number(decimalPart) / Number(maxDecimals))
          .toLocaleString(undefined, {
            minimumFractionDigits: decimalDigits,
            maximumFractionDigits: decimalDigits,
            signDisplay: 'never',
          })
          .slice(1) // Remove leading '0.'
      : '');
  return (signed && 0n > num && 0 !== parseFloat(res) ? '-' : '') + res;
}

export function removeTrailingZeros(num: string) {
  if (num.includes('.')) {
    return num.replace(/\.?0+$/, '');
  }
  return num;
}

export const BigMath = {
  abs(x: bigint) {
    return 0n > x ? -x : x;
  },
  sign(x: bigint) {
    if (0n === x) {
      return 0n;
    }
    return 0n > x ? -1n : 1n;
  },
  pow(base: bigint, exponent: bigint) {
    return base ** exponent;
  },
  min(...values: bigint[]) {
    if (0 === values.length) {
      return 0n;
    } else {
      let value = values[0]!;
      for (const v of values) {
        if (v < value) {
          value = v;
        }
      }
      return value;
    }
  },
  max(...values: bigint[]) {
    if (0 === values.length) {
      return 0n;
    } else {
      let value = values[0]!;
      for (const v of values) {
        if (v > value) {
          value = v;
        }
      }
      return value;
    }
  },
};

export const bigIntReplacer = (key: string, value: any): any =>
  typeof value === 'bigint' ? value.toString() : value;
