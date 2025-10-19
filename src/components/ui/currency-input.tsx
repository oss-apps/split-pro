import React from 'react';
import { Input, InputProps } from './input';
import { cn } from '~/lib/utils';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputProps, 'type' | 'inputMode'> & {
    currency: string;
    bigIntValue: bigint;
    strValue: string;
    onValueChange: (v: { strValue?: string; bigIntValue?: bigint }) => void;
    allowNegative?: boolean;
    hideSymbol?: boolean;
  }
>(
  (
    {
      className,
      currency,
      bigIntValue,
      allowNegative,
      strValue,
      onValueChange,
      hideSymbol,
      ...props
    },
    ref,
  ) => {
    const { getCurrencyHelpersCached } = useTranslationWithUtils(undefined);
    const { format, parseToCleanString, toSafeBigInt, sanitizeInput, stripCurrencySymbol } =
      getCurrencyHelpersCached(currency);

    return (
      <Input
        className={cn('text-lg placeholder:text-sm', className)}
        inputMode="decimal"
        ref={ref}
        value={strValue}
        onFocus={() => onValueChange({ strValue: parseToCleanString(strValue) })}
        onBlur={() => {
          const formattedValue = format(strValue, allowNegative);
          return onValueChange({
            strValue: hideSymbol ? stripCurrencySymbol(formattedValue) : formattedValue,
          });
        }}
        onChange={(e) => {
          const rawValue = e.target.value;
          const strValue = sanitizeInput(rawValue, allowNegative);
          const bigIntValue = toSafeBigInt(strValue, allowNegative);
          onValueChange({ strValue, bigIntValue });
        }}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
