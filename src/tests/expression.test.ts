import {
  expressionResultToDecimal,
  isExpression,
  isValidExpressionResult,
  safeEvaluateExpression,
} from '../utils/expression';

const evaluateToDecimal = (input: string) => {
  const result = safeEvaluateExpression(input);
  return null === result ? null : expressionResultToDecimal(result);
};

describe('isExpression', () => {
  it.each([
    ['123', false],
    ['123.45', false],
    ['-123.45', false],
    ['-', false],
    ['', false],
    ['123+456', true],
    ['123-456', true],
    ['123*456', true],
    ['123/456', true],
    ['(123)', true],
    ['30.5+10.75-12-1.86', true],
    ['(30.5+10.75)*2', true],
  ])('should return %p for input %p', (input, expected) => {
    expect(isExpression(input)).toBe(expected);
  });
});

describe('safeEvaluateExpression', () => {
  it.each([
    ['123', '123'],
    ['123.45', '123.45'],
    ['0.5', '0.5'],
    ['30.5+10.75', '41.25'],
    ['30.5+10.75-12-1.86', '27.39'],
    ['100-50', '50'],
    ['10*5', '50'],
    ['10/4', '2.5'],
    ['(30.5+10.75)*2', '82.5'],
    ['100/(2+3)', '20'],
    ['-10+5', '-5'],
    ['10-(-5)', '15'],
    ['1/-2', '-0.5'],
    ['-1/-2', '0.5'],
    ['--10', '10'],
    ['+10', '10'],
    ['0.1+0.2', '0.3'],
    ['.5+.5', '1'],
    ['1,5+2', '3.5'],
    ['100*0.01', '1'],
    ['9007199254740992+1', '9007199254740993'],
    ['999999999999999999999999+1', '1000000000000000000000000'],
  ])('should evaluate %p to %p', (input, expected) => {
    expect(evaluateToDecimal(input)).toBe(expected);
  });

  it.each([
    [''],
    ['abc'],
    ['30.5+'],
    ['+'],
    ['()'],
    ['(30.5+10'],
    ['30.5/0'],
    ['..5'],
    ['1.2.3'],
    ['30.5++'],
  ])('should return null for invalid expression %p', (input) => {
    expect(safeEvaluateExpression(input)).toBeNull();
  });

  it('should handle whitespace', () => {
    expect(evaluateToDecimal(' 30.5 + 10.75 ')).toBe('41.25');
  });

  it('should handle operator precedence', () => {
    expect(evaluateToDecimal('2+3*4')).toBe('14');
    expect(evaluateToDecimal('2*3+4')).toBe('10');
    expect(evaluateToDecimal('2+3*4-1')).toBe('13');
    expect(evaluateToDecimal('20/5*2')).toBe('8');
  });

  it('should handle parentheses precedence', () => {
    expect(evaluateToDecimal('2*(3+4)')).toBe('14');
    expect(evaluateToDecimal('(2+3)*(4-1)')).toBe('15');
    expect(evaluateToDecimal('2+3*(4-1)')).toBe('11');
  });

  it('preserves exact fractions for currency conversion', () => {
    expect(safeEvaluateExpression('0.0050000000005+0')).toEqual({
      numerator: 10000000001n,
      denominator: 2000000000000n,
    });
  });
});

describe('isValidExpressionResult', () => {
  it.each([
    ['5', false, true],
    ['-5', false, false],
    ['-5', true, true],
    [null, false, false],
  ])('should return %p for result %p with allowNegative=%p', (result, allowNegative, expected) => {
    expect(
      isValidExpressionResult(
        null === result ? null : safeEvaluateExpression(result),
        allowNegative,
      ),
    ).toBe(expected);
  });
});
