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
    const num_unified_decimal = num.replace(',', '.');
    const parts = num_unified_decimal.split('.');
    const whole = BigInt(parts[0]!);
    const fraction = BigInt(Math.round(parseFloat(`0.${parts[1] ?? '0'}`) * 100));

    return whole * 100n + fraction;
  } else {
    return 0n;
  }
}

export function toUINumber(num = 0n, currencyCode: CurrencyCode = 'USD') {
  const { decimalDigits } = CURRENCIES[currencyCode];
  const maxDecimals = 10n ** BigInt(decimalDigits);
  const decimalPart = num % 100n;
  const wholePart = Number(BigMath.abs(num) / 100n);

  let result = Number(wholePart);

  if (decimalPart !== 0n) {
    const frac = Number(decimalPart) / Number(maxDecimals);
    result += frac;
  }

  return result;
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

export function currencyConversion(amount: bigint, rate: number) {
  return BigMath.roundDiv(amount * BigInt(Math.round(rate * 10000)), 10000n);
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
  roundDiv(x: bigint, y: bigint) {
    if (0n === y) {
      throw new Error('Division by zero');
    }
    const absRemainderDoubled = (BigMath.abs(x) % BigMath.abs(y)) * 2n;
    const q = x / y;
    return (
      q +
      (absRemainderDoubled < BigMath.abs(y) ||
      (absRemainderDoubled === BigMath.abs(y) && q % 2n === 0n)
        ? 0n
        : x > 0n === y > 0n
          ? 1n
          : -1n)
    );
  },
};

export const bigIntReplacer = (key: string, value: any): any =>
  typeof value === 'bigint' ? value.toString() : value;
