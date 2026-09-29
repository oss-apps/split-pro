import React from 'react';
import { Input, InputProps } from './input';
import { cn } from '~/lib/utils';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isExpression, isValidExpressionResult, safeEvaluateExpression } from '~/utils/expression';

const CurrencyInput: React.FC<
  Omit<InputProps, 'type' | 'inputMode'> & {
    currency: string;
    strValue: string;
    onValueChange: (v: { strValue?: string; bigIntValue?: bigint; isValid?: boolean }) => void;
    allowNegative?: boolean;
    hideSymbol?: boolean;
  }
> = ({ className, currency, allowNegative, strValue, onValueChange, hideSymbol, ...props }) => {
  const { getCurrencyHelpersCached } = useTranslationWithUtils(undefined);
  const { format, toSafeBigInt, expressionResultToBigInt, sanitizeInput, sanitizeExpressionInput } =
    getCurrencyHelpersCached(currency);

  return (
    <Input
      className={cn('text-lg placeholder:text-sm', className)}
      inputMode="decimal"
      value={strValue}
      onBlur={() => {
        if (isExpression(strValue)) {
          return;
        }
        const formattedValue = format(strValue, { signed: allowNegative, hideSymbol });
        return onValueChange({ strValue: formattedValue });
      }}
      onChange={(e) => {
        const rawValue = e.target.value;
        if (isExpression(rawValue)) {
          const normalizedValue =
            !isExpression(strValue) && rawValue.startsWith(strValue)
              ? `${sanitizeInput(strValue, allowNegative)}${rawValue.slice(strValue.length)}`
              : rawValue;
          const sanitized = sanitizeExpressionInput(normalizedValue, allowNegative, true);
          const evaluated = safeEvaluateExpression(sanitized);
          const isValid = isValidExpressionResult(evaluated, allowNegative);
          const bigIntValue =
            isValid && null !== evaluated ? expressionResultToBigInt(evaluated) : undefined;
          onValueChange({ strValue: sanitized, bigIntValue, isValid });
        } else {
          const strValue = sanitizeInput(rawValue, allowNegative, true);
          const bigIntValue = toSafeBigInt(strValue, allowNegative);
          onValueChange({ strValue, bigIntValue, isValid: true });
        }
      }}
      {...props}
    />
  );
};

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
