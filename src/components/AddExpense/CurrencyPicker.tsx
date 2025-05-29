import { Check } from 'lucide-react';
import { memo, useCallback } from 'react';

import { CURRENCIES, type CurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import { AppDrawer, DrawerClose } from '../ui/drawer';

function CurrencyPickerInner({
  currentCurrency = 'USD',
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
    <AppDrawer
      trigger={
        <div className="flex w-[70px] justify-center rounded-lg border py-2  text-center text-base">
          {currentCurrency}
        </div>
      }
      title="Select currency"
      className="h-[70vh]"
      shouldCloseOnAction
    >
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
              <DrawerClose className="flex items-center">
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
              </DrawerClose>
            </CommandItem>
          ))}
        </CommandGroup>
      </Command>
    </AppDrawer>
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
