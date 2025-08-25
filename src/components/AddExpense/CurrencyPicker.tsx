import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { CURRENCIES, type CurrencyCode } from '~/lib/currency';
import { getLocalizedCurrencyName } from '~/utils/i18n/client';

import { GeneralPicker } from '../GeneralPicker';

function CurrencyPickerInner({
  currentCurrency = 'USD',
  onCurrencyPick,
}: {
  currentCurrency: CurrencyCode;
  onCurrencyPick: (currency: CurrencyCode) => void;
}) {
  const { t } = useTranslation('currencies');

  const onSelect = useCallback(
    (currentValue: string) => {
      const currency = currentValue ?? 'USD';
      onCurrencyPick(currency as CurrencyCode);
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
      const translatedName = getLocalizedCurrencyName(currency.code, t);
      return (
        <>
          <p>{translatedName}</p>
          <p className="text-muted-foreground">{currency.code}</p>
        </>
      );
    },
    [t],
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
