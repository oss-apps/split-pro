export function toSafeBigInt(num: number | string) {
  if (typeof num === 'number') {
    return BigInt(Math.round(num * 100));
  } else if (typeof num === 'string') {
    if (num.trim() === '') {
      return 0n;
    }
    const parsed = parseFloat(num);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number string: ${num}`);
    }
    const num_unified_decimal = num.replace(',', '.');
    const parts = num_unified_decimal.split('.');
    const whole = BigInt(parts[0]!);
    const fraction = BigInt(Math.round(parseFloat(`0.${parts[1] ?? '0'}`) * 100));

    return whole * 100n + fraction;
  } else {
    throw new Error(`Unsupported type: ${typeof num}`);
  }
}

export function toUIString(num = 0n) {
  const absNum = BigMath.abs(num);
  return `${absNum.toString().slice(0, -2) || '0'}.${absNum.toString().slice(-2).padStart(2, '0')}`;
}

export function removeTrailingZeros(num: string) {
  if (num.includes('.')) {
    return num.replace(/\.?0+$/, '');
  }
  return num;
}

export const BigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x;
  },
  sign(x: bigint) {
    if (x === 0n) return 0n;
    return x < 0n ? -1n : 1n;
  },
  pow(base: bigint, exponent: bigint) {
    return base ** exponent;
  },
  min(...values: bigint[]) {
    if (values.length === 0) {
      return 0n;
    } else {
      let value = values[0]!;
      for (const v of values) if (v < value) value = v;
      return value;
    }
  },
  max(...values: bigint[]) {
    if (values.length === 0) {
      return 0n;
    } else {
      let value = values[0]!;
      for (const v of values) if (v > value) value = v;
      return value;
    }
  },
};
