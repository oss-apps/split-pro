import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { currencyConversion, getRatePrecision } from '~/utils/numbers';

import { toast } from 'sonner';
import { env } from '~/env';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { CurrencyPicker } from '../AddExpense/CurrencyPicker';
import { DateSelector } from '../AddExpense/DateSelector';
import { Button } from '../ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const CurrencyConversion: React.FC<{
  amount: bigint;
  editingRate?: number;
  editingTargetCurrency?: string;
  currency: string;
  children: ReactNode;
  onSubmit: (data: {
    from: CurrencyCode;
    to: CurrencyCode;
    amount: bigint;
    rate: number;
    ratePrecision: number;
  }) => Promise<void> | void;
}> = ({ amount, editingRate, editingTargetCurrency, currency, children, onSubmit }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const { toUIString, toSafeBigInt } = getCurrencyHelpersCached(currency);

  const [amountStr, setAmountStr] = useState('');
  const [rate, setRate] = useState('');
  const [ratePrecision, setRatePrecision] = useState(0);
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const preferredCurrency = useAddExpenseStore((state) => state.currency);
  const { setCurrency } = useAddExpenseStore((state) => state.actions);
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [rateDate, setRateDate] = useState<Date>(new Date());
  const getCurrencyRate = api.expense.getCurrencyRate.useQuery(
    { from: currency, to: targetCurrency, date: rateDate },
    { enabled: currency !== targetCurrency },
  );

  const { toUIString: toUITargetString } = getCurrencyHelpersCached(targetCurrency);

  useEffect(() => {
    if (getCurrencyRate.isPending) {
      setRate('');
      setRatePrecision(0);
      setTargetAmountStr('');
    }
  }, [getCurrencyRate.isPending]);

  useEffect(() => {
    setAmountStr(toUIString(amount, false, true));
    if (editingRate) {
      const precision = Number.isFinite(editingRate) ? getRatePrecision(editingRate.toString()) : 0;
      setRate(editingRate.toFixed(precision));
      setRatePrecision(precision);
    } else {
      setRate('');
      setRatePrecision(0);
    }
    if (editingTargetCurrency && isCurrencyCode(editingTargetCurrency)) {
      setTargetCurrency(editingTargetCurrency);
    }
  }, [amount, editingRate, editingTargetCurrency, toUIString]);

  useEffect(() => {
    if (getCurrencyRate.data?.rate) {
      setRate(getCurrencyRate.data.rate.toFixed(getCurrencyRate.data.precision));
      setRatePrecision(getCurrencyRate.data.precision);
    }
  }, [getCurrencyRate.data]);

  const dateDisabled = useMemo(() => ({ after: new Date() }), []);

  useEffect(() => {
    if (!isCurrencyCode(currency) || !isCurrencyCode(targetCurrency)) {
      return;
    }

    const targetAmount = currencyConversion({
      from: currency,
      to: targetCurrency,
      amount: toSafeBigInt(amountStr),
      rate: Number(rate),
      ratePrecision,
    });
    setTargetAmountStr(toUITargetString(targetAmount, false, true));
  }, [amountStr, rate, ratePrecision, toSafeBigInt, toUITargetString, currency, targetCurrency]);

  const onUpdateAmount = useCallback(
    ({ strValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
    },
    [setAmountStr],
  );

  const onChangeRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    // Allow empty while typing
    if (raw === '') {
      setRate('');
      setRatePrecision(0);
      return;
    }
    // Only digits and optional dot
    if (!/^[0-9]*\.?[0-9]*$/.test(raw)) {
      return;
    }
    const [int = '', dec = ''] = raw.split('.');
    const precision = raw.includes('.') ? dec.length : 0;
    const normalized = raw.includes('.') ? `${int}.${dec}` : int;
    setRate(normalized);
    setRatePrecision(precision);
  }, []);

  const onChangeTargetCurrency = useCallback(
    (currency: CurrencyCode) => {
      setRate('');
      setRatePrecision(0);
      setTargetCurrency(currency);
      setCurrency(currency);
    },
    [setCurrency],
  );

  const onChangeTargetAmount = useCallback(
    ({ bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (bigIntValue && isCurrencyCode(currency)) {
        const amount = currencyConversion({
          amount: bigIntValue ?? 0n,
          rate: 1 / Number(rate),
          ratePrecision,
          from: targetCurrency,
          to: currency,
        });
        setAmountStr(toUIString(amount, false, true));
      }
    },
    [rate, ratePrecision, toUIString, targetCurrency, currency],
  );

  const onSave = useCallback(async () => {
    try {
      if (!isCurrencyCode(currency)) {
        toast.error(t('errors.invalid_currency_code', { code: currency }));
        return;
      }

      await onSubmit({
        amount: getCurrencyHelpersCached(currency).toSafeBigInt(amountStr),
        rate: Number(rate),
        ratePrecision,
        from: currency,
        to: targetCurrency,
      });
      toast.success(t('currency_conversion.success_toast'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.currency_conversion_error'));
    }
  }, [
    onSubmit,
    targetCurrency,
    amountStr,
    rate,
    ratePrecision,
    currency,
    getCurrencyHelpersCached,
    t,
  ]);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.back')}
      title={t('currency_conversion.title')}
      className="h-[70vh]"
      actionTitle={t('actions.save')}
      shouldCloseOnAction
      actionOnClick={onSave}
      actionDisabled={
        !isCurrencyCode(targetCurrency) ||
        !amountStr ||
        !rate ||
        Number(rate) <= 0 ||
        Number(amountStr) <= 0 ||
        Number(targetAmountStr) <= 0
      }
    >
      <div className="flex flex-col items-center gap-2 sm:mt-6">
        <div className="w-full">
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 place-items-center gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-y-16">
            {/* From amount */}
            <div className="flex w-full max-w-[240px] items-end gap-2 sm:col-span-2">
              <div className="flex flex-col gap-2">
                <Label className="capitalize">{t('ui.expense.from')}</Label>
                <Button variant="outline" className="text-base" disabled>
                  {currency}
                </Button>
              </div>
              <CurrencyInput
                aria-label="Amount"
                currency={currency}
                strValue={amountStr}
                hideSymbol
                onValueChange={onUpdateAmount}
              />
            </div>

            <div className="flex w-full max-w-[240px] items-end gap-2 sm:col-span-2">
              <div className="flex flex-col gap-2">
                <Label className="capitalize">{t('ui.expense.to')}</Label>
                {editingTargetCurrency ? (
                  <Button variant="outline" className="text-base" disabled>
                    {editingTargetCurrency}
                  </Button>
                ) : (
                  <CurrencyPicker
                    className="mx-auto"
                    currentCurrency={targetCurrency}
                    onCurrencyPick={onChangeTargetCurrency}
                    // Client env vars with pages router only work after next build :/
                    showOnlyFrankfurter={env.NEXT_PUBLIC_FRANKFURTER_USED}
                  />
                )}
              </div>
              <CurrencyInput
                aria-label="Converted Amount"
                currency={targetCurrency}
                strValue={targetAmountStr}
                onValueChange={onChangeTargetAmount}
                hideSymbol
                disabled={getCurrencyRate.isPending || currency === targetCurrency}
              />
            </div>

            {/* Rate */}
            <div className="flex w-full max-w-[240px] items-start sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:h-full sm:flex-col sm:justify-between">
              <div className="flex w-1/2 flex-col gap-2 sm:w-full">
                <Label className="capitalize">{t('currency_conversion.rate')}</Label>
                <div className="flex flex-col">
                  <Input
                    aria-label="Rate"
                    type="number"
                    step={0 === ratePrecision ? '1' : `0.${'0'.repeat(ratePrecision - 1)}1`}
                    min={0}
                    value={rate}
                    inputMode="numeric"
                    onChange={onChangeRate}
                    disabled={getCurrencyRate.isPending || currency === targetCurrency}
                  />
                  {currency !== targetCurrency && getCurrencyRate.isPending && (
                    <span className="pointer-events-none text-xs text-gray-500">
                      {t('currency_conversion.fetching_rate')}
                    </span>
                  )}
                  {Boolean(rate) && (
                    <>
                      <span className="pointer-events-none text-xs text-gray-500">
                        1 {currency} = {Number(rate).toFixed(ratePrecision)} {targetCurrency}
                      </span>
                      <span className="pointer-events-none text-xs text-gray-500">
                        1 {targetCurrency} = {(1 / Number(rate)).toFixed(ratePrecision)} {currency}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex w-1/2 flex-col items-end gap-2 sm:w-full sm:items-start">
                <Label className="capitalize">
                  {t('actions.fetch')} {t('ui.expense.from')}
                </Label>
                <div className="flex h-11 items-center justify-center">
                  <DateSelector
                    mode="single"
                    required
                    disabled={dateDisabled}
                    selected={rateDate}
                    onSelect={setRateDate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
};
