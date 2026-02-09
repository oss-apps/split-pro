'use client';

import { EqualApproximately } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { currencyConversion } from '~/utils/numbers';

import { isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { SHOW_ALL_VALUE, useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Skeleton } from '../ui/skeleton';

interface ConvertibleBalanceProps {
  className?: string;
  balances: { currency: string; amount: bigint }[];
  showMultiOption?: boolean;
  forceShowButton?: boolean;
  withText?: boolean;
  entityId?: number;
}

export const ConvertibleBalance: React.FC<ConvertibleBalanceProps> = ({
  className = '',
  balances,
  showMultiOption = false,
  forceShowButton = false,
  withText = false,
  entityId,
}) => {
  const { t } = useTranslationWithUtils();
  const [open, setOpen] = useState(false);

  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference(entityId));
  const setSelectedCurrency = useCurrencyPreferenceStore(
    (s) => (preference?: string) => s.setPreference(entityId, preference),
  );

  // Available currencies from balances
  const availableCurrencies = useMemo(
    () => balances.map((b) => b.currency).filter((c, i, arr) => arr.indexOf(c) === i),
    [balances],
  );

  const currentDate = useMemo(() => new Date(), []);

  const ratesQuery = api.expense.getBatchCurrencyRates.useQuery(
    {
      from: availableCurrencies,
      to: selectedCurrency,
      date: currentDate,
    },
    {
      enabled:
        Boolean(selectedCurrency) &&
        selectedCurrency !== SHOW_ALL_VALUE &&
        0 < availableCurrencies.length,
    },
  );

  // Determine if we should show all or convert
  // If showMultiOption is false and no currency selected, default to first currency
  const shouldShowAll = showMultiOption
    ? !selectedCurrency || selectedCurrency === SHOW_ALL_VALUE
    : false;

  const handleCurrencySelect = useCallback(
    (value: string) => {
      setSelectedCurrency(value);
      setOpen(false);
    },
    [setSelectedCurrency],
  );

  const totalConvertedAmount = useMemo(() => {
    if (shouldShowAll || 0 === balances.length || ratesQuery.isPending) {
      return null;
    }

    let total = 0n;

    for (const balance of balances) {
      if (balance.currency === selectedCurrency) {
        total += balance.amount;
      } else {
        const rate = ratesQuery.data?.rates.get(balance.currency);
        if (!rate) {
          toast.error(t('errors.currency_conversion_failed'));
          console.error(
            `Empty conversion rate returned for ${balance.currency} to ${selectedCurrency}`,
          );
          setSelectedCurrency();
          return null;
        }

        if (!isCurrencyCode(selectedCurrency) || !isCurrencyCode(balance.currency)) {
          toast.error(t('errors.currency_conversion_failed'));
          console.error(
            `Invalid selected currency codes: ${selectedCurrency} or ${balance.currency}`,
          );
          setSelectedCurrency();
          return null;
        }

        // Convert amount using the rate
        const convertedValue = currencyConversion({
          from: balance.currency,
          to: selectedCurrency,
          amount: balance.amount,
          rate,
        });
        total += convertedValue;
      }
    }

    return total;
  }, [shouldShowAll, balances, ratesQuery, selectedCurrency, t, setSelectedCurrency]);

  if (0 === balances.length) {
    return <AmountDisplay className={className} amount={0n} currency="USD" />;
  }

  // If only one currency, no conversion needed
  if (1 === balances.length && !forceShowButton) {
    const balance = balances[0]!;
    return (
      <AmountDisplay
        withText={withText}
        className={className}
        amount={balance.amount}
        currency={balance.currency}
      />
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6',
              (totalConvertedAmount ?? 0n) > 0n && 'text-positive',
              (totalConvertedAmount ?? 0n) < 0n && 'text-negative',
            )}
            disabled={ratesQuery.isLoading}
          >
            <EqualApproximately className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('ui.select_currency')}</h4>
            <RadioGroup
              value={selectedCurrency || SHOW_ALL_VALUE}
              onValueChange={handleCurrencySelect}
            >
              {showMultiOption && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={SHOW_ALL_VALUE} id={`${entityId}-show-all`} />
                  <Label htmlFor={`${entityId}-show-all`} className="cursor-pointer">
                    {t('ui.show_all_currencies')}
                  </Label>
                </div>
              )}
              {availableCurrencies.map((currency) => (
                <div key={currency} className="flex items-center space-x-2">
                  <RadioGroupItem value={currency} id={`${entityId}-${currency}`} />
                  <Label htmlFor={`${entityId}-${currency}`} className="cursor-pointer">
                    {currency}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>
      <div className={cn('flex gap-1', className)}>
        {shouldShowAll ? (
          balances.map((balance, idx) => (
            <React.Fragment key={balance.currency}>
              <AmountDisplay
                withText={withText}
                amount={balance.amount}
                currency={balance.currency}
              />
              {idx < balances.length - 1 && (
                <span className={balance.amount > 0 ? 'text-positive' : 'text-negative'}> + </span>
              )}
            </React.Fragment>
          ))
        ) : ratesQuery.isLoading ? (
          <Skeleton className="h-5 w-20" />
        ) : (
          <AmountDisplay
            withText={withText}
            className={className}
            amount={totalConvertedAmount ? totalConvertedAmount : balances[0]!.amount}
            currency={totalConvertedAmount ? selectedCurrency : balances[0]!.currency}
          />
        )}
      </div>
    </span>
  );
};

const AmountDisplay: React.FC<{
  className?: string;
  amount: bigint;
  currency: string;
  withText?: boolean;
}> = ({ className = '', amount, currency, withText = false }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  if (amount === 0n) {
    return <span className={cn('text-gray-500', className)}>{t('ui.settled_up')}</span>;
  }

  const isPositive = amount > 0n;
  return (
    <div>
      {withText && (
        <div
          className={cn(
            'text-right text-xs',
            isPositive ? 'text-positive' : 'text-negative',
            className,
          )}
        >
          {t('actors.you')} {t(`ui.expense.you.${isPositive ? 'lent' : 'owe'}`)}
        </div>
      )}
      <span className={cn(isPositive ? 'text-positive' : 'text-negative', className)}>
        {getCurrencyHelpersCached(currency).toUIString(amount)}
      </span>
    </div>
  );
};
