export const isExpression = (input: string): boolean => {
  if (/[+*/()]/.test(input)) {
    return true;
  }
  if (input.length > 1 && input.slice(1).includes('-')) {
    return true;
  }
  return false;
};

export interface ExpressionResult {
  numerator: bigint;
  denominator: bigint;
}

export const isValidExpressionResult = (
  result: ExpressionResult | null,
  allowNegative = false,
): result is ExpressionResult => null !== result && (allowNegative || 0n <= result.numerator);

const abs = (value: bigint) => (0n > value ? -value : value);

const gcd = (a: bigint, b: bigint): bigint => {
  if (0n === b) {
    return a;
  }
  return gcd(b, a % b);
};

const reduce = ({ numerator, denominator }: ExpressionResult): ExpressionResult => {
  if (0n > denominator) {
    numerator = -numerator;
    denominator = -denominator;
  }

  if (0n === numerator) {
    return { numerator: 0n, denominator: 1n };
  }

  const divisor = gcd(abs(numerator), denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
};

const add = (left: ExpressionResult, right: ExpressionResult): ExpressionResult =>
  reduce({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });

const multiply = (left: ExpressionResult, right: ExpressionResult): ExpressionResult =>
  reduce({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });

const divide = (left: ExpressionResult, right: ExpressionResult): ExpressionResult | null => {
  if (0n === right.numerator) {
    return null;
  }

  return reduce({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
};

const negate = (value: ExpressionResult): ExpressionResult => ({
  numerator: -value.numerator,
  denominator: value.denominator,
});

const formatExpressionResult = ({ numerator, denominator }: ExpressionResult): string => {
  const decimalScale = 10n ** 10n;
  const absoluteScaledNumerator = abs(numerator) * decimalScale;
  let scaledValue = absoluteScaledNumerator / denominator;

  if (2n * (absoluteScaledNumerator % denominator) >= denominator) {
    scaledValue += 1n;
  }

  if (0n === scaledValue) {
    return '0';
  }

  const integerPart = scaledValue / decimalScale;
  const fractionPart = (scaledValue % decimalScale).toString().padStart(10, '0').replace(/0+$/, '');
  const sign = 0n > numerator ? '-' : '';

  return `${sign}${integerPart}${fractionPart ? `.${fractionPart}` : ''}`;
};

/** Evaluates an arithmetic expression exactly, returning null for invalid input or division by zero. */
export const safeEvaluateExpression = (input: string): ExpressionResult | null => {
  const normalized = input.replace(/\s/g, '').replaceAll(',', '.');
  if ('' === normalized) {
    return null;
  }

  let pos = 0;

  const peek = (): string => (pos < normalized.length ? normalized[pos]! : '');
  const consume = (): string => normalized[pos++]!;

  const parseExpression = (): ExpressionResult | null => {
    let left = parseTerm();
    if (null === left) {
      return null;
    }

    while ('+' === peek() || '-' === peek()) {
      const op = consume();
      const right = parseTerm();
      if (null === right) {
        return null;
      }
      left = '+' === op ? add(left, right) : add(left, negate(right));
    }
    return left;
  };

  const parseTerm = (): ExpressionResult | null => {
    let left = parseFactor();
    if (null === left) {
      return null;
    }

    while ('*' === peek() || '/' === peek()) {
      const op = consume();
      const right = parseFactor();
      if (null === right) {
        return null;
      }
      if ('*' === op) {
        left = multiply(left, right);
      } else {
        left = divide(left, right);
        if (null === left) {
          return null;
        }
      }
    }
    return left;
  };

  const parseFactor = (): ExpressionResult | null => {
    if ('+' === peek()) {
      consume();
      return parseFactor();
    }
    if ('-' === peek()) {
      consume();
      const factor = parseFactor();
      if (null === factor) {
        return null;
      }
      return negate(factor);
    }
    return parsePrimary();
  };

  const parsePrimary = (): ExpressionResult | null => {
    if ('(' === peek()) {
      consume();
      const result = parseExpression();
      if (null === result || ')' !== peek()) {
        return null;
      }
      consume();
      return result;
    }
    return parseNumber();
  };

  const parseNumber = (): ExpressionResult | null => {
    let numStr = '';
    while (pos < normalized.length && /[0-9.]/.test(peek())) {
      numStr += consume();
    }
    if ('' === numStr || '.' === numStr) {
      return null;
    }
    const [integerPart = '', fractionPart = ''] = numStr.split('.');
    if (numStr.split('.').length > 2) {
      return null;
    }

    return reduce({
      numerator: BigInt(`${integerPart || '0'}${fractionPart}`),
      denominator: 10n ** BigInt(fractionPart.length),
    });
  };

  const result = parseExpression();
  if (null === result || pos !== normalized.length) {
    return null;
  }
  return result;
};

export const expressionResultToDecimal = formatExpressionResult;
