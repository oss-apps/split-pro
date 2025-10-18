import type { CurrencyCode } from '~/lib/currency';
import { CURRENCIES, isCurrencyCode } from '~/lib/currency';

export const getCurrencyHelpers = ({
  locale = 'en-US',
  currency = 'USD',
}: {
  locale?: string;
  currency?: string;
}) => {
  currency = isCurrencyCode(currency) ? currency : 'USD';
  const { decimalDigits } = CURRENCIES[currency as CurrencyCode];

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalDigits,
  });

  const currencySymbol =
    formatter.formatToParts(4).find(({ type }) => type === 'currency')?.value ?? '';
  const thousandSeparator =
    formatter.formatToParts(11111111).find(({ type }) => type === 'group')?.value ?? '';
  const decimalSeparator =
    formatter.formatToParts(1.1).find(({ type }) => type === 'decimal')?.value ?? '.';
  const literalSeparator =
    formatter.formatToParts(1.1).find(({ type }) => type === 'literal')?.value ?? '';
  const decimalMultiplier = parseInt(`1${'0'.repeat(decimalDigits)}`, 10);
  const decimalMultiplierN = BigInt(decimalMultiplier);

  const bigIntToNumber = (value: bigint) =>
    Number(BigMath.abs(value) / decimalMultiplierN) +
    Number(BigMath.abs(value) % decimalMultiplierN) / decimalMultiplier;

  const toSafeBigInt = (stringNumber: string | number | bigint) => {
    if (typeof stringNumber === 'bigint') {
      return stringNumber;
    }
    if (typeof stringNumber === 'number') {
      const int = Math.round(stringNumber * decimalMultiplier);
      return BigInt(!Number.isNaN(int) ? int : 0);
    }

    return toSafeBigInt(parseToNumberBeforeSubmit(stringNumber));
  };

  /* Parse localized string number to number before submit */
  const parseToNumberBeforeSubmit = (stringNumber: string | number | bigint) => {
    if (typeof stringNumber === 'number') {
      return stringNumber;
    }
    if (typeof stringNumber === 'bigint') {
      return bigIntToNumber(stringNumber);
    }

    if (stringNumber === '') {
      return 0;
    }

    return parseFloat(
      stringNumber
        .replace(currencySymbol, '')
        .replace(literalSeparator, '')
        .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
        .replace(new RegExp(`\\${decimalSeparator}`), '.'),
    );
  };

  const trimExceedingDecimals = (inputString: string) => {
    const [integer, decimals = ''] = inputString.split(decimalSeparator);
    const trimmedDecimals = decimals.slice(0, decimalDigits);
    return [integer, trimmedDecimals].join(decimalSeparator);
  };

  /* Sanitize input by allowing only digits, negative sign, and one decimal separator */
  const sanitizeInput = (input: string, signed = false) => {
    let cleaned = '';
    let hasDecimalSeparator = false;
    let hasNegativeSign = false;

    `${input}`.split('').forEach((letter) => {
      //allowing only one separator
      if (letter === decimalSeparator && !hasDecimalSeparator) {
        cleaned += letter;
        hasDecimalSeparator = true;
        return;
      }
      // when a user presses '-' sign, switch the sign of the number
      if (letter === '-' && !hasNegativeSign) {
        hasNegativeSign = true;
      }

      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(letter)) {
        cleaned += letter;
      }
    });
    if (
      signed &&
      hasNegativeSign &&
      parseFloat(cleaned) !== 0 &&
      !Number.isNaN(parseFloat(cleaned))
    ) {
      cleaned = `-${cleaned}`;
    }

    if (hasDecimalSeparator) {
      return trimExceedingDecimals(cleaned);
    }

    return cleaned;
  };

  const normalizeToMaxLength = (inputString: string) => {
    const sanitized = sanitizeInput(inputString);
    const trimmedExceedingDecimals = trimExceedingDecimals(sanitized);
    return trimmedExceedingDecimals.endsWith(decimalSeparator)
      ? trimmedExceedingDecimals.slice(0, -1)
      : trimmedExceedingDecimals;
  };

  /* Parse various input types to clean string number */
  const parseToCleanString = (value: unknown) => {
    if (value === formatter.format(0)) {
      return '';
    }

    if (typeof value === 'number') {
      return `${value}`.replace('.', decimalSeparator);
    }

    if (typeof value === 'bigint') {
      return parseToCleanString(bigIntToNumber(value));
    }

    if (value === '') {
      return '';
    }

    if (value === currencySymbol) {
      return '';
    }

    if (typeof value === 'undefined' || value === null) {
      return '';
    }

    if (typeof value === 'string') {
      return normalizeToMaxLength(value);
    }

    return '';
  };

  /* Format a string number to localized, beautified currency string */
  const format = (value: string) => {
    if (value === '') {
      return formatter.format(0);
    }

    const normalizedToMaxLength = normalizeToMaxLength(value);
    return formatter.format(parseToNumberBeforeSubmit(normalizedToMaxLength));
  };

  const toUIString = (value: unknown) => {
    const cleanString = parseToCleanString(value);
    return format(cleanString);
  };

  const stripCurrencySymbol = (value: string) =>
    value.replace(new RegExp(`\\${currencySymbol}`, 'g'), '').trim();

  return {
    parseToCleanString,
    parseToNumberBeforeSubmit,
    toUIString,
    stripCurrencySymbol,
    format,
    formatter,
    sanitizeInput,
    toSafeBigInt,
  };
};

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
