export function toFixedNumber(num: number) {
  return num / 100;
}

export function toInteger(num: number) {
  return Math.round(num * 100);
}

export function toUIString(num: number) {
  return toFixedNumber(Math.abs(num)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
