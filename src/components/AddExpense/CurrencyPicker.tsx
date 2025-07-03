import { Check } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'next-i18next';

import { CURRENCIES, type CurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { getLocalizedCurrencyName } from '~/utils/i18n/client';

import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command';
import { AppDrawer, DrawerClose } from '../ui/drawer';

function CurrencyPickerInner({
  currentCurrency = 'USD',
  onCurrencyPick,
}: {
  currentCurrency: CurrencyCode;
  onCurrencyPick: (currency: CurrencyCode) => void;
}) {
  const { t } = useTranslation('expense_details');

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
        <div className="flex w-[70px] justify-center rounded-lg border py-2 text-center text-base">
          {currentCurrency}
        </div>
      }
      title={t('ui.currency.title')}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <Command className="h-[50vh]">
        <CommandInput className="text-lg" placeholder={t('ui.currency.placeholder')} />
        <CommandList>
          <CommandEmpty>{t('ui.currency.no_currency_found')}</CommandEmpty>
          {Object.values(CURRENCIES).map((currency) => {
            const translatedName = getLocalizedCurrencyName(currency.code as CurrencyCode, t);
            return (
              <CommandItem
                key={`${currency.code}-${translatedName}`}
                value={`${currency.code}-${translatedName}`}
                onSelect={onSelect}
              >
                <DrawerClose className="flex items-center">
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      `${currency.code}-${translatedName.toLowerCase()}`.startsWith(currentCurrency)
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                  <div className="flex gap-2">
                    <p>{translatedName}</p>
                    <p className="text-muted-foreground">{currency.code}</p>
                  </div>
                </DrawerClose>
              </CommandItem>
            );
          })}
        </CommandList>
      </Command>
    </AppDrawer>
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
