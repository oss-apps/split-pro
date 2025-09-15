import { type User } from '@prisma/client';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { BigMath, toSafeBigInt } from '~/utils/numbers';

import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';
import { CurrencyPicker } from '../AddExpense/CurrencyPicker';
import { DateSelector } from '../AddExpense/DateSelector';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { env } from '~/env';
import { useAddExpenseStore } from '~/store/addStore';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export const CurrencyConversion: React.FC<{
  amount: bigint;
  editingRate?: number;
  currency: string;
  sender: User;
  receiver: User;
  children: ReactNode;
  expenseId?: string;
  groupId: number | null;
}> = ({ amount, editingRate, currency, sender, receiver, children, groupId, expenseId }) => {
  const { t } = useTranslationWithUtils();

  const addOrEditCurrencyConversionMutation = api.expense.addOrEditCurrencyConversion.useMutation();
  const utils = api.useUtils();

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
    setAmountStr((Number(BigMath.abs(amount)) / 100).toString());
    setRate(editingRate ? editingRate.toFixed(4) : '');
  }, [amount, editingRate]);

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
      await addOrEditCurrencyConversionMutation.mutateAsync({
        amount: toSafeBigInt(amountStr),
        rate: Number(rate),
        from: currency,
        to: targetCurrency,
        senderId: sender.id,
        receiverId: receiver.id,
        groupId,
        expenseId,
      });
      toast.success(t('ui.currency_conversion.success_toast'));
      utils.invalidate().catch(console.error);
    } catch (error) {
      console.error(error);
      toast.error(t('ui.currency_conversion.error_toast'));
    }
  }, [
    addOrEditCurrencyConversionMutation,
    targetCurrency,
    amountStr,
    rate,
    currency,
    sender.id,
    receiver.id,
    expenseId,
    groupId,
    t,
    utils,
  ]);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('ui.actions.back')}
      title={t('ui.currency_conversion.title')}
      className="h-[70vh]"
      actionTitle={t('ui.actions.save')}
      shouldCloseOnAction
      actionOnClick={onSave}
      actionDisabled={
        !isCurrencyCode(targetCurrency) ||
        !amountStr ||
        !rate ||
        Number(rate) <= 0 ||
        Number(amountStr) <= 0 ||
        Number(targetAmountStr) <= 0 ||
        targetCurrency === currency
      }
    >
      <div className="mt-6 flex flex-col items-center gap-6">
        <div className="flex max-w-xl flex-col items-center gap-2 text-center">
          <p className="text-sm text-gray-500">{t('ui.currency_conversion.description')}</p>
          {targetCurrency === currency && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">
              Currency conversion only works for different currencies
            </div>
          )}
        </div>

        <div className="w-full">
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 place-items-center gap-x-4 gap-y-16 sm:grid-cols-3">
            {/* From amount */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                Amount
              </label>
              <div className="relative">
                <Input
                  aria-label="Amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amountStr}
                  inputMode="decimal"
                  className="h-11 w-full rounded-lg pr-14 text-right text-base shadow-sm"
                  onChange={onChangeAmount}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500">
                  {currency}
                </span>
              </div>
            </div>

            {/* Rate */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                Rate
              </label>
              <div className="relative flex">
                <Input
                  aria-label="Rate"
                  type="number"
                  step="0.0001"
                  min={0}
                  value={rate}
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg pr-4 text-right text-base shadow-sm"
                  onChange={onChangeRate}
                  disabled={getCurrencyRate.isPending || currency === targetCurrency}
                />
                {getCurrencyRate.isPending && (
                  <span className="pointer-events-none absolute -bottom-5 left-0 text-[11px] text-gray-500">
                    Fetching rate…
                  </span>
                )}
                {!!rate && (
                  <>
                    <span className="pointer-events-none absolute -bottom-5 left-0 text-[11px] text-gray-500">
                      1 {currency} = {Number(rate).toFixed(4)} {targetCurrency}
                    </span>
                    <span className="pointer-events-none absolute -bottom-10 left-0 text-[11px] text-gray-500">
                      1 {targetCurrency} = {(1 / Number(rate)).toFixed(4)} {currency}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* To amount */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                Converted amount
              </label>
              <div className="relative">
                <Input
                  aria-label="Converted amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={targetAmountStr}
                  inputMode="decimal"
                  className="h-11 w-full rounded-lg pr-14 text-right text-base shadow-sm"
                  onChange={onChangeTargetAmount}
                  disabled={getCurrencyRate.isPending || currency === targetCurrency}
                />
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500">
                  {targetCurrency}
                </span>
              </div>
            </div>

            {/* From currency (read-only) */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                From
              </label>
              <div className="flex w-full justify-center">
                <Button variant="outline" className="h-11 w-[70px] rounded-lg text-base" disabled>
                  {currency}
                </Button>
              </div>
            </div>

            {/* Date */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                Date
              </label>
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

            {/* To currency */}
            <div className="w-full max-w-[240px]">
              <label className="mb-1 block text-xs font-medium tracking-wide text-gray-500 capitalize">
                To
              </label>
              <div className="flex h-11 items-center justify-center">
                <CurrencyPicker
                  className="mx-auto"
                  currentCurrency={targetCurrency}
                  onCurrencyPick={onChangeTargetCurrency}
                  // Client env vars with pages router only work after next build :/
                  showOnlyFrankfurter={env.NEXT_PUBLIC_FRANKFURTER_USED}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
};
