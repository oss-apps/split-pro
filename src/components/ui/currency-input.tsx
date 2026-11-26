import React from 'react';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cn } from '~/lib/utils';
import { isExpression, safeEvaluateExpression } from '~/utils/expression';

import { Input, type InputProps } from './input';

const CurrencyInput: React.FC<
  Omit<InputProps, 'type' | 'inputMode'> & {
    currency: string;
    strValue: string;
    onValueChange: (v: { strValue?: string; bigIntValue?: bigint }) => void;
    allowExpressions?: boolean;
    allowNegative?: boolean;
    hideSymbol?: boolean;
  }
> = ({
  className,
  currency,
  allowExpressions = false,
  allowNegative,
  strValue,
  onValueChange,
  hideSymbol,
  ...props
}) => {
  const { getCurrencyHelpersCached } = useTranslationWithUtils(undefined);
  const {
    format,
    parseToCleanString,
    toSafeBigInt,
    expressionResultToBigInt,
    hasDuplicateDecimalSeparator,
    removeValidGroupingSeparators,
    sanitizeExpressionInput,
    sanitizeInput,
  } = getCurrencyHelpersCached(currency);
  const hasDuplicateDecimal = hasDuplicateDecimalSeparator(strValue);

  return (
    <Input
      className={cn('text-lg placeholder:text-sm', className)}
      inputMode={allowExpressions ? 'text' : 'decimal'}
      value={strValue}
      onFocus={() => {
        if (!allowExpressions || (!isExpression(strValue) && !hasDuplicateDecimal)) {
          onValueChange({ strValue: parseToCleanString(strValue, allowNegative) });
        }
      }}
      onBlur={() => {
        if (allowExpressions && (isExpression(strValue) || hasDuplicateDecimal)) {
          return;
        }

        const formattedValue = format(strValue, { signed: allowNegative, hideSymbol });
        return onValueChange({ strValue: formattedValue });
      }}
      onChange={(e) => {
        const rawValue = e.target.value;
        const normalizedValue = allowExpressions
          ? removeValidGroupingSeparators(rawValue)
          : rawValue;
        if (allowExpressions && hasDuplicateDecimalSeparator(normalizedValue)) {
          return onValueChange({ strValue: normalizedValue, bigIntValue: 0n });
        }
        if (allowExpressions && isExpression(normalizedValue)) {
          const strValue = sanitizeExpressionInput(normalizedValue);
          const evaluated = safeEvaluateExpression(strValue);
          return onValueChange({
            strValue,
            bigIntValue: null === evaluated ? 0n : expressionResultToBigInt(evaluated),
          });
        }

        const strValue = sanitizeInput(normalizedValue, allowNegative, true);
        const bigIntValue = toSafeBigInt(strValue, allowNegative);
        onValueChange({ strValue, bigIntValue });
      }}
      {...props}
    />
  );
};

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
