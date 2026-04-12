import { memo, useCallback, useMemo } from 'react';

import { CURRENCIES, type CurrencyCode, parseCurrencyCode } from '~/lib/currency';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { GeneralPicker } from '../GeneralPicker';
import { Button } from '../ui/button';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

function CurrencyPickerInner({
  className,
  currentCurrency = 'USD',
  onCurrencyPick,
}: {
  className?: string;
  currentCurrency: CurrencyCode;
  onCurrencyPick: (currency: CurrencyCode) => void;
}) {
  const { t, getCurrencyName } = useTranslationWithUtils(['currencies']);
  const { recentCurrencies, addToRecentCurrencies } = useCurrencyPreferenceStore();

  const onSelect = useCallback(
    (currentValue: string) => {
      onCurrencyPick(parseCurrencyCode(currentValue));
      addToRecentCurrencies(parseCurrencyCode(currentValue));
    },
    [onCurrencyPick, addToRecentCurrencies],
  );

  const trigger = useMemo(
    () => (
      <Button variant="outline" className="w-[70px] rounded-lg py-2 text-base">
        {currentCurrency}
      </Button>
    ),
    [currentCurrency],
  );

  const extractValue = useCallback((currency: { code: CurrencyCode }) => currency.code, []);
  const extractKey = useCallback((currency: { code: CurrencyCode }) => currency.code, []);
  const selected = useCallback(
    (currency: { code: CurrencyCode }) => currency.code === currentCurrency,
    [currentCurrency],
  );
  const renderCurrency = useCallback(
    (currency: { code: CurrencyCode }) => {
      const translatedName = getCurrencyName(currency.code);
      return (
        <>
          <p>{translatedName}</p>
          <p className="text-muted-foreground">{currency.code}</p>
        </>
      );
    },
    [getCurrencyName],
  );
  const recentCurrencyObjects = useMemo(
    () => recentCurrencies.map((code) => CURRENCIES[code]),
    [recentCurrencies],
  );
  const items = useMemo(() => {
    const baseItems = Object.values(CURRENCIES);
    const uniqueItems = [
      ...recentCurrencyObjects,
      ...baseItems.filter((c) => !recentCurrencies.includes(c.code as CurrencyCode)),
    ];
    return uniqueItems;
  }, [recentCurrencyObjects, recentCurrencies]);

  return (
    <GeneralPicker
      className={className}
      trigger={trigger}
      title={t('title')}
      placeholderText={t('placeholder')}
      noOptionsText={t('no_currency_found')}
      onSelect={onSelect}
      items={items}
      extractValue={extractValue}
      extractKey={extractKey}
      selected={selected}
      render={renderCurrency}
    />
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
