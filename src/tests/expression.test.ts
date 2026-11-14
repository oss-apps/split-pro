import { isExpression, safeEvaluateExpression, sanitizeExpressionInput } from '../utils/expression';

describe('isExpression', () => {
  it.each([
    ['123.45', false],
    ['-123.45', false],
    ['-', false],
    ['30.5+10.75-12-1.86', true],
    ['10*5', true],
    ['10/4', true],
    ['(2+3)*4', true],
  ])('returns %p for %p', (input, expected) => {
    expect(isExpression(input)).toBe(expected);
  });
});

describe('sanitizeExpressionInput', () => {
  it('keeps arithmetic and decimal characters only', () => {
    expect(sanitizeExpressionInput('$30.5 + 10,75 xyz', 2)).toBe('30.5+10.75');
  });

  it('limits each operand to the currency precision', () => {
    expect(sanitizeExpressionInput('1.234+3.456/0.789', 2)).toBe('1.23+3.45/0.78');
  });

  it('normalizes alternate decimal marks to the locale separator', () => {
    expect(sanitizeExpressionInput('12,5+3.75', 2, '.', ',')).toBe('12.5+3.75');
    expect(sanitizeExpressionInput('12,5+3.75', 2, ',', '.')).toBe('12,5+3,75');
  });

  it('drops fractional digits for zero-decimal currencies', () => {
    expect(sanitizeExpressionInput('12.34+5.6', 0)).toBe('12+5');
  });
});

describe('safeEvaluateExpression', () => {
  it.each([
    ['30.5+10.75-12-1.86', { numerator: 2739n, denominator: 100n }],
    ['2+3*4', { numerator: 14n, denominator: 1n }],
    ['(2+3)*4', { numerator: 20n, denominator: 1n }],
    ['10/4', { numerator: 5n, denominator: 2n }],
    ['2++3', { numerator: 5n, denominator: 1n }],
    ['0.1+0.2', { numerator: 3n, denominator: 10n }],
    ['1,5+2', { numerator: 7n, denominator: 2n }],
    ['12,5+3,75', { numerator: 65n, denominator: 4n }],
    ['9007199254740992+1', { numerator: 9007199254740993n, denominator: 1n }],
    ['-10+5', { numerator: -5n, denominator: 1n }],
  ])('evaluates %p exactly', (input, expected) => {
    expect(safeEvaluateExpression(input)).toEqual(expected);
  });

  it.each(['', 'abc', '30.5+', '()', '(2+3', '30/0', '1.2.3'])('rejects %p', (input) => {
    expect(safeEvaluateExpression(input)).toBeNull();
  });
});
