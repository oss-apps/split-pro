import { memo, useCallback, useMemo } from 'react';

import { CURRENCIES, type CurrencyCode, parseCurrencyCode } from '~/lib/currency';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { GeneralPicker } from '../GeneralPicker';
import { Button } from '../ui/button';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

function CurrencyPickerInner({
  className,
  currentCurrency,
  onCurrencyPick,
  allowClear = false,
}: {
  className?: string;
  currentCurrency?: CurrencyCode | null;
  onCurrencyPick: (currency: CurrencyCode | null) => void;
  allowClear?: boolean;
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

  const onClear = useCallback(() => {
    onCurrencyPick(null);
  }, [onCurrencyPick]);

  const trigger = useMemo(
    () => (
      <Button variant="outline" className="w-[70px] rounded-lg py-2 text-base">
        {currentCurrency ?? ''}
      </Button>
    ),
    [currentCurrency],
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

  const renderedItems = useMemo(
    () =>
      allowClear
        ? [
            {
              code: '__CLEAR__' as const,
              label:
                t('ui.not_set', { ns: 'common' }) ?? t('expense_details.clear', { ns: 'common' }),
              isClear: true,
            },
            ...items,
          ]
        : items,
    [allowClear, items, t],
  );

  const extractValue = useCallback(
    (currency: { code: CurrencyCode } | { code: '__CLEAR__' }) => currency.code,
    [],
  );
  const extractKey = extractValue;
  const extractKeywords = useCallback(
    (currency: { code: CurrencyCode } | { code: '__CLEAR__' }) => {
      if ('__CLEAR__' === currency.code) {
        return [];
      }

      const translatedName = getCurrencyName(currency.code);
      return [translatedName];
    },
    [getCurrencyName],
  );
  const selectedOption = useCallback(
    (currency: { code: CurrencyCode } | { code: '__CLEAR__' }) =>
      '__CLEAR__' === currency.code ? currentCurrency === null : currency.code === currentCurrency,
    [currentCurrency],
  );

  const renderCurrencyItem = useCallback(
    (currency: { code: CurrencyCode } | { code: '__CLEAR__'; label: string; isClear: true }) => {
      if ('__CLEAR__' === currency.code) {
        return <p>{currency.label}</p>;
      }

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

  return (
    <GeneralPicker
      className={className}
      trigger={trigger}
      title={t('title')}
      placeholderText={t('placeholder')}
      noOptionsText={t('no_currency_found')}
      onSelect={(value) => ('__CLEAR__' === value ? onClear() : onSelect(value))}
      items={renderedItems}
      extractValue={extractValue}
      extractKey={extractKey}
      extractKeywords={extractKeywords}
      selected={selectedOption}
      render={renderCurrencyItem}
    />
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
