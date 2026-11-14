import React from 'react';
import { Input, InputProps } from './input';
import { cn } from '~/lib/utils';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isExpression, safeEvaluateExpression, sanitizeExpressionInput } from '~/utils/expression';

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
    decimalDigits,
    decimalSeparator,
    alternativeDecimalSeparator,
    format,
    parseToCleanString,
    toSafeBigInt,
    expressionResultToBigInt,
    sanitizeInput,
  } = getCurrencyHelpersCached(currency);

  return (
    <Input
      className={cn('text-lg placeholder:text-sm', className)}
      inputMode={allowExpressions ? 'text' : 'decimal'}
      value={strValue}
      onFocus={() => {
        if (!allowExpressions || !isExpression(strValue)) {
          onValueChange({ strValue: parseToCleanString(strValue, allowNegative) });
        }
      }}
      onBlur={() => {
        if (allowExpressions && isExpression(strValue)) {
          return;
        }

        const formattedValue = format(strValue, { signed: allowNegative, hideSymbol });
        return onValueChange({ strValue: formattedValue });
      }}
      onChange={(e) => {
        const rawValue = e.target.value;
        if (allowExpressions && isExpression(rawValue)) {
          const strValue = sanitizeExpressionInput(
            rawValue,
            decimalDigits,
            decimalSeparator,
            alternativeDecimalSeparator,
          );
          const evaluated = safeEvaluateExpression(strValue);
          return onValueChange({
            strValue,
            bigIntValue: null === evaluated ? 0n : expressionResultToBigInt(evaluated),
          });
        }

        const strValue = sanitizeInput(rawValue, allowNegative, true);
        const bigIntValue = toSafeBigInt(strValue, allowNegative);
        onValueChange({ strValue, bigIntValue });
      }}
      {...props}
    />
  );
};

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
