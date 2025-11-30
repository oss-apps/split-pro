'use client';

import { EqualApproximately } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useSession } from '~/hooks/useSession';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { currencyConversion } from '~/utils/numbers';

import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Skeleton } from '../ui/skeleton';
import { Label } from '../ui/label';
import { cn } from '~/lib/utils';
import { isCurrencyCode } from '~/lib/currency';

interface ConvertibleBalanceProps {
  className?: string;
  balances: { currency: string; amount: bigint }[];
  showMultiOption?: boolean;
  entityId?: number;
}

export const SHOW_ALL_VALUE = '__SHOW_ALL__';

export const getConvertibleBalanceSessionKey = (entityId?: number) =>
  `balance-currency-${entityId ?? 'global'}`;

export const ConvertibleBalance: React.FC<ConvertibleBalanceProps> = ({
  className = '',
  balances,
  showMultiOption = false,
  entityId,
}) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [open, setOpen] = useState(false);

  const sessionKey = getConvertibleBalanceSessionKey(entityId);
  const [selectedCurrency, setSelectedCurrency] = useSession(sessionKey);

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
        !!selectedCurrency && selectedCurrency !== SHOW_ALL_VALUE && 0 < availableCurrencies.length,
    },
  );

  // Determine if we should show all or convert
  // If showMultiOption is false and no currency selected, default to first currency
  const shouldShowAll = showMultiOption
    ? !selectedCurrency || selectedCurrency === SHOW_ALL_VALUE
    : false;

  // Set default currency if showMultiOption is false and no selection
  useEffect(() => {
    if (!showMultiOption && !selectedCurrency && 0 < availableCurrencies.length) {
      setSelectedCurrency(availableCurrencies[0]!);
    }
  }, [showMultiOption, selectedCurrency, availableCurrencies, setSelectedCurrency]);

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
          setSelectedCurrency(SHOW_ALL_VALUE);
          return null;
        }

        if (!isCurrencyCode(selectedCurrency!) || !isCurrencyCode(balance.currency)) {
          toast.error(t('errors.currency_conversion_failed'));
          console.error(
            `Invalid selected currency codes: ${selectedCurrency} or ${balance.currency}`,
          );
          setSelectedCurrency(SHOW_ALL_VALUE);
          return null;
        }

        // Convert amount using the rate
        const convertedValue = currencyConversion({
          from: balance.currency,
          to: selectedCurrency!,
          amount: balance.amount,
          rate,
        });
        total += convertedValue;
      }
    }

    return total;
  }, [shouldShowAll, balances, ratesQuery, selectedCurrency, t, setSelectedCurrency]);

  // If only one currency, no conversion needed
  if (1 === balances.length) {
    const balance = balances[0]!;
    return (
      <span className={0 < balance.amount ? 'text-emerald-500' : 'text-orange-600'}>
        {getCurrencyHelpersCached(balance.currency).toUIString(balance.amount)}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
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
                  <RadioGroupItem value={SHOW_ALL_VALUE} id={`${sessionKey}-show-all`} />
                  <Label htmlFor={`${sessionKey}-show-all`} className="cursor-pointer">
                    {t('ui.show_all_currencies')}
                  </Label>
                </div>
              )}
              {availableCurrencies.map((currency) => (
                <div key={currency} className="flex items-center space-x-2">
                  <RadioGroupItem value={currency} id={`${sessionKey}-${currency}`} />
                  <Label htmlFor={`${sessionKey}-${currency}`} className="cursor-pointer">
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
            <span
              key={balance.currency}
              className={balance.amount > 0 ? 'text-positive' : 'text-negative'}
            >
              {getCurrencyHelpersCached(balance.currency).toUIString(balance.amount)}{' '}
              {idx < balances.length - 1 ? '+' : ''}
            </span>
          ))
        ) : ratesQuery.isPending ? (
          <Skeleton className="h-5 w-20" />
        ) : totalConvertedAmount !== null ? (
          <span className={0 < totalConvertedAmount ? 'text-emerald-500' : 'text-orange-600'}>
            {getCurrencyHelpersCached(selectedCurrency!).toUIString(totalConvertedAmount)}
          </span>
        ) : null}
      </div>
    </span>
  );
};
