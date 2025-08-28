import { memo, useCallback, useMemo } from 'react';

import { CURRENCIES, type CurrencyCode, parseCurrencyCode } from '~/lib/currency';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { GeneralPicker } from '../GeneralPicker';

function CurrencyPickerInner({
  currentCurrency = 'USD',
  onCurrencyPick,
}: {
  currentCurrency: CurrencyCode;
  onCurrencyPick: (currency: CurrencyCode) => void;
}) {
  const { t, getCurrencyName } = useTranslationWithUtils(['currencies']);

  const onSelect = useCallback(
    (currentValue: string) => {
      onCurrencyPick(parseCurrencyCode(currentValue));
    },
    [onCurrencyPick],
  );

  const trigger = useMemo(
    () => (
      <div className="flex w-[70px] justify-center rounded-lg border py-2 text-center text-base">
        {currentCurrency}
      </div>
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

  return (
    <GeneralPicker
      trigger={trigger}
      title={t('title')}
      placeholderText={t('placeholder')}
      noOptionsText={t('no_currency_found')}
      onSelect={onSelect}
      items={Object.values(CURRENCIES)}
      extractValue={extractValue}
      extractKey={extractKey}
      selected={selected}
      render={renderCurrency}
    />
  );
}

export const CurrencyPicker = memo(CurrencyPickerInner);
