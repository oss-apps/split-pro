import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { BigMath, toSafeBigInt } from '~/utils/numbers';

import { toast } from 'sonner';
import { env } from '~/env';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { useAddExpenseStore } from '~/store/addStore';
import { CurrencyPicker } from '../AddExpense/CurrencyPicker';
import { DateSelector } from '../AddExpense/DateSelector';
import { Button } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const CurrencyConversion: React.FC<{
  amount: bigint;
  editingRate?: number;
  editingTargetCurrency?: CurrencyCode;
  currency: string;
  children: ReactNode;
  onSubmit: (data: {
    from: CurrencyCode;
    to: CurrencyCode;
    amount: bigint;
    rate: number;
  }) => Promise<void> | void;
}> = ({ amount, editingRate, editingTargetCurrency, currency, children, onSubmit }) => {
  const { t } = useTranslationWithUtils();

  const [amountStr, setAmountStr] = useState('');
  const [rate, setRate] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const preferredCurrency = useAddExpenseStore((state) => state.currency);
  const { setCurrency } = useAddExpenseStore((state) => state.actions);
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>(preferredCurrency);
  const [rateDate, setRateDate] = useState<Date>(new Date());
  const getCurrencyRate = api.expense.getCurrencyRate.useQuery(
    { from: currency, to: targetCurrency, date: rateDate },
    { enabled: currency !== targetCurrency },
  );

  useEffect(() => {
    if (getCurrencyRate.isPending) {
      setRate('');
      setTargetAmountStr('');
    }
  }, [getCurrencyRate.isPending]);

  useEffect(() => {
    setAmountStr((Number(BigMath.abs(amount)) / 100).toString());
    setRate(editingRate ? editingRate.toFixed(4) : '');
    if (editingTargetCurrency) {
      setTargetCurrency(editingTargetCurrency);
    }
  }, [amount, editingRate, editingTargetCurrency]);

  useEffect(() => {
    if (getCurrencyRate.data?.rate) {
      setRate(getCurrencyRate.data.rate.toFixed(4));
    }
  }, [getCurrencyRate.data, amountStr]);

  const dateDisabled = useMemo(() => ({ after: new Date() }), []);

  useEffect(() => {
    setTargetAmountStr((Number(amountStr) * Number(rate)).toFixed(2));
  }, [amountStr, rate]);

  const onChangeAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (Number(value) < 0 || Number.isNaN(Number(value))) {
      return;
    }
    setAmountStr(value);
  }, []);

  const onChangeRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    // Allow empty while typing
    if (raw === '') {
      setRate('');
      return;
    }
    // Only digits and optional dot
    if (!/^[0-9]*\.?[0-9]*$/.test(raw)) {
      return;
    }
    const [int = '', dec = ''] = raw.split('.');
    const trimmedDec = dec.slice(0, 4);
    const normalized = raw.includes('.') ? `${int}.${trimmedDec}` : int;
    setRate(normalized);
  }, []);

  const onChangeTargetCurrency = useCallback(
    (currency: CurrencyCode) => {
      setRate('');
      setTargetCurrency(currency);
      setCurrency(currency);
    },
    [setCurrency],
  );

  const onChangeTargetAmount = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      if (Number(value) < 0 || Number.isNaN(Number(value))) {
        return;
      }
      setAmountStr((Number(value) / Number(rate)).toFixed(2));
    },
    [rate],
  );

  const onSave = useCallback(async () => {
    try {
      if (!isCurrencyCode(currency)) {
        toast.error(t('errors.invalid_currency_code', { code: currency }));
        return;
      }

      await onSubmit({
        amount: toSafeBigInt(amountStr),
        rate: Number(rate),
        from: currency,
        to: targetCurrency,
      });
      toast.success(t('ui.currency_conversion.success_toast'));
    } catch (error) {
      console.error(error);
      toast.error(t('ui.currency_conversion.error_toast'));
    }
  }, [onSubmit, targetCurrency, amountStr, rate, currency, t]);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.back')}
      title={t('ui.currency_conversion.title')}
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
              <Input
                aria-label="Amount"
                type="number"
                step="0.01"
                min={0}
                value={amountStr}
                inputMode="decimal"
                onChange={onChangeAmount}
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
              <Input
                aria-label="Converted Amount"
                type="number"
                step="0.01"
                min={0}
                value={targetAmountStr}
                inputMode="decimal"
                onChange={onChangeTargetAmount}
                disabled={getCurrencyRate.isPending || currency === targetCurrency}
              />
            </div>

            {/* Rate */}
            <div className="flex w-full max-w-[240px] items-start sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:h-full sm:flex-col sm:justify-between">
              <div className="flex w-1/2 flex-col gap-2 sm:w-full">
                <Label className="capitalize">{t('ui.currency_conversion.rate')}</Label>
                <div className="flex flex-col">
                  <Input
                    aria-label="Rate"
                    type="number"
                    step="0.0001"
                    min={0}
                    value={rate}
                    inputMode="numeric"
                    onChange={onChangeRate}
                    disabled={getCurrencyRate.isPending || currency === targetCurrency}
                  />
                  {getCurrencyRate.isPending && (
                    <span className="pointer-events-none text-xs text-gray-500">
                      {t('ui.currency_conversion.fetching_rate')}
                    </span>
                  )}
                  {!!rate && (
                    <>
                      <span className="pointer-events-none text-xs text-gray-500">
                        1 {currency} = {Number(rate).toFixed(4)} {targetCurrency}
                      </span>
                      <span className="pointer-events-none text-xs text-gray-500">
                        1 {targetCurrency} = {(1 / Number(rate)).toFixed(4)} {currency}
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
