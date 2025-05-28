import { CommandEmpty, CommandGroup, CommandInput, CommandItem } from 'cmdk';
import { Check, Command } from 'lucide-react';
import { memo, useCallback } from 'react';

import { CURRENCIES, type CurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';

function CurrencyPickerInner({
  currentCurrency,
  onCurrencyPick,
}: {
  currentCurrency: CurrencyCode;
  onCurrencyPick: (currency: CurrencyCode) => void;
}) {
  const onSelect = useCallback(
    (currentValue: string) => {
      const currency = currentValue.split('-')[0]?.toUpperCase() ?? 'USD';
      onCurrencyPick(currency as CurrencyCode);
    },
    [onCurrencyPick],
  );

  return (
    <Command className="h-[50vh]">
      <CommandInput className="text-lg" placeholder="Search currency" />
      <CommandEmpty>No currency found.</CommandEmpty>
      <CommandGroup className="h-full overflow-auto">
        {Object.values(CURRENCIES).map((framework) => (
          <CommandItem
            key={`${framework.code}-${framework.name}`}
            value={`${framework.code}-${framework.name}`}
            onSelect={onSelect}
          >
            <Check
              className={cn(
                'mr-2 h-4 w-4',
                `${framework.code}-${framework.name.toLowerCase()}`.startsWith(currentCurrency)
                  ? 'opacity-100'
                  : 'opacity-0',
              )}
            />
            <div className="flex gap-2">
              <p>{framework.name}</p>
              <p className=" text-muted-foreground">{framework.code}</p>
            </div>
          </CommandItem>
        ))}
      </CommandGroup>
    </Command>
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
