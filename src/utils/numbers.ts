import { CURRENCIES, type CurrencyCode, isCurrencyCode } from '~/lib/currency';

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
  const alternativeDecimalSeparator = decimalSeparator === '.' ? ',' : '.';
  const literalSeparator =
    formatter.formatToParts(1.1).find(({ type }) => type === 'literal')?.value ?? '';
  const decimalMultiplier = parseInt(`1${'0'.repeat(decimalDigits)}`, 10);
  const decimalMultiplierN = BigInt(decimalMultiplier);

  const toSafeBigInt = (stringNumber: string | number | bigint, signed = false): bigint => {
    if (typeof stringNumber === 'string') {
      return parseToBigIntBeforeSubmit(sanitizeInput(stringNumber, signed));
    }

    return parseToBigIntBeforeSubmit(stringNumber);
  };

  /* Parse sanitized string to number before submit */
  const parseToBigIntBeforeSubmit = (stringNumber: string | number | bigint): bigint => {
    if (typeof stringNumber === 'number') {
      if (Number.isNaN(stringNumber)) {
        return 0n;
      } else {
        const integerPart = BigInt(Math.floor(Math.abs(stringNumber)) * decimalMultiplier);
        const fractionPart = BigInt(Math.round((Math.abs(stringNumber) % 1) * decimalMultiplier));
        const sign = BigInt(Math.sign(stringNumber));
        return (integerPart + fractionPart) * sign;
      }
    }
    if (typeof stringNumber === 'bigint') {
      return stringNumber;
    }

    if (stringNumber === '') {
      return 0n;
    }

    const cleanStr = stringNumber
      .replace(currencySymbol, '')
      .replace(literalSeparator, '')
      .replace(new RegExp(`\\${thousandSeparator}`, 'g'), '')
      .replace(new RegExp(`\\${decimalSeparator}`), '.');

    const [integerPart = '0', decimalPart = ''] = cleanStr.split('.');

    return (
      BigInt(integerPart) * decimalMultiplierN +
      BigInt(Math.round(parseFloat(`0.${decimalPart || '0'}`) * decimalMultiplier)) *
        (integerPart.startsWith('-') ? -1n : 1n)
    );
  };

  const trimExceedingDecimals = (inputString: string) => {
    const [integer, decimals = ''] = inputString.split(decimalSeparator);
    const trimmedDecimals = decimals.slice(0, decimalDigits);
    return [integer, trimmedDecimals].join(decimalSeparator);
  };

  /* Sanitize input by allowing only digits, negative sign, and one decimal separator */
  const sanitizeInput = (input: string, signed = false, alternativeDecimal = false) => {
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
      if (
        alternativeDecimal &&
        letter === alternativeDecimalSeparator &&
        !hasDecimalSeparator &&
        !input.includes(decimalSeparator)
      ) {
        cleaned += decimalSeparator;
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
  const parseToCleanString = (value: unknown, signed = false) => {
    if (value === formatter.format(0)) {
      return '';
    }

    if (typeof value === 'number') {
      return `${value}`.replace('.', decimalSeparator);
    }

    if (typeof value === 'bigint') {
      const sign = value < 0n && signed ? '-' : '';
      const integer = `${value / decimalMultiplierN}`;
      const fraction = `${value}`.slice(-decimalDigits);
      return (
        sign +
        normalizeToMaxLength(
          decimalDigits > 0 ? `${integer}${decimalSeparator}${fraction}` : integer,
        )
      );
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
  const format = (
    value: string,
    { signed = false, hideSymbol = false }: { signed?: boolean; hideSymbol?: boolean },
  ) => {
    if (value === '') {
      return formatter.format(0);
    }

    const sign = value.startsWith('-') && signed ? '-' : '';
    const normalizedToMaxLength = normalizeToMaxLength(value);
    const bigintValue = parseToBigIntBeforeSubmit(normalizedToMaxLength);
    const parts = formatter.formatToParts(BigMath.abs(bigintValue) / decimalMultiplierN);
    const auxParts = formatter.formatToParts(
      (Number(BigMath.abs(bigintValue) % decimalMultiplierN) / decimalMultiplier) *
        Number(BigMath.sign(bigintValue)),
    );
    const fractionPart = auxParts.find(({ type }) => type === 'fraction');
    const decimalPart = auxParts.find(({ type }) => type === 'decimal');

    const hasFraction = parts.some(({ type }) => type === 'fraction');

    if (fractionPart && decimalPart) {
      if (!hasFraction) {
        const lastIntegerIndex = parts.findLastIndex(({ type }) => type === 'integer');
        parts.splice(lastIntegerIndex + 1, 0, decimalPart, fractionPart);
      } else {
        parts.forEach((part) => {
          if (part.type === 'fraction') {
            part.value = fractionPart.value;
          } else if (part.type === 'decimal') {
            part.value = decimalPart.value;
          }
        });
      }
    }

    return (
      sign +
      parts
        .filter(({ type }) => !hideSymbol || type !== 'currency')
        .map(({ value }) => value)
        .join('')
    );
  };

  const toUIString = (value: unknown, signed = false, hideSymbol = false) => {
    const cleanString = parseToCleanString(value, signed);
    return format(cleanString, { signed, hideSymbol });
  };

  return {
    parseToCleanString,
    toUIString,
    toUIStringSigned: (value: unknown) => toUIString(value, true),
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

export function currencyConversion({
  from,
  to,
  amount,
  rate,
}: {
  from: CurrencyCode;
  to: CurrencyCode;
  amount: bigint;
  rate: number;
}) {
  const fromDecimalDigits = CURRENCIES[from].decimalDigits;
  const toDecimalDigits = CURRENCIES[to].decimalDigits;
  const preMultiplier = BigInt(10 ** Math.max(toDecimalDigits - fromDecimalDigits, 0));
  const postMultiplier = BigInt(10 ** Math.max(fromDecimalDigits - toDecimalDigits, 0));
  return BigMath.roundDiv(
    amount * preMultiplier * BigInt(Math.round(rate * 10000)),
    postMultiplier * 10000n,
  );
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
