import React from 'react';
import { Input, InputProps } from './input';
import { cn } from '~/lib/utils';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

const CurrencyInput: React.FC<
  Omit<InputProps, 'type' | 'inputMode'> & {
    currency: string;
    strValue: string;
    onValueChange: (v: { strValue?: string; bigIntValue?: bigint }) => void;
    allowNegative?: boolean;
    hideSymbol?: boolean;
  }
> = ({ className, currency, allowNegative, strValue, onValueChange, hideSymbol, ...props }) => {
  const { getCurrencyHelpersCached } = useTranslationWithUtils(undefined);
  const { format, parseToCleanString, toSafeBigInt, sanitizeInput } =
    getCurrencyHelpersCached(currency);

  return (
    <Input
      className={cn('text-lg placeholder:text-sm', className)}
      inputMode="decimal"
      value={strValue}
      onFocus={() => onValueChange({ strValue: parseToCleanString(strValue) })}
      onBlur={() => {
        const formattedValue = format(strValue, { signed: allowNegative, hideSymbol });
        return onValueChange({ strValue: formattedValue });
      }}
      onChange={(e) => {
        const rawValue = e.target.value;
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
