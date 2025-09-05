import { type User } from '@prisma/client';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import type { CurrencyCode} from '~/lib/currency';
import { isCurrencyCode } from '~/lib/currency';
import { CurrencyPicker } from '../AddExpense/CurrencyPicker';
import { DateSelector } from '../AddExpense/DateSelector';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';

export const CurrencyConversion: React.FC<{
  amount: bigint;
  currency: string;
  friend: User;
  user: User;
  children: ReactNode;
  groupId: number;
}> = ({ amount, currency, friend, user, children, groupId }) => {
  const { t } = useTranslationWithUtils();
  const [amountStr, setAmountStr] = useState((Number(BigMath.abs(amount)) / 100).toString());
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>(
    isCurrencyCode(currency) ? currency : 'USD',
  );
  const [rateDate, setRateDate] = useState<Date>(new Date());
  const getCurrencyRate = api.expense.getCurrencyRate.useQuery(
    { from: currency, to: targetCurrency, date: rateDate },
    { enabled: currency !== targetCurrency },
  );

  useEffect(() => {
    if (getCurrencyRate.data?.rate) {
      setRate(getCurrencyRate.data.rate.toString());
    }
  }, [getCurrencyRate.data]);

  const [rate, setRate] = useState('1');

  const onChangeAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setAmountStr(value);
  }, []);

  const onChangeRate = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setRate(value);
  }, []);

  const onChangeTargetCurrency = useCallback((currency: CurrencyCode) => {
    setTargetCurrency(currency);
  }, []);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('ui.actions.back')}
      title={t('ui.currency_conversion.title')}
      className="h-[70vh]"
      actionTitle={t('ui.actions.save')}
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <p className="mt-2 text-center text-sm text-gray-400">
            {t('ui.currency_conversion.description')}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 grid-rows-2 items-center justify-center gap-2 text-center">
          <Input
            type="number"
            value={amountStr}
            inputMode="decimal"
            className="mx-auto w-[150px] text-lg"
            onChange={onChangeAmount}
          />
          <Input
            type="number"
            value={rate}
            inputMode="decimal"
            className="mx-auto w-[150px] text-lg"
            onChange={onChangeRate}
          />
          <Input
            type="number"
            value={(Number(amountStr) * Number(rate)).toFixed(2)}
            inputMode="decimal"
            className="mx-auto w-[150px] text-lg"
          />
          <p className="text-lg">{currency}</p>

          <DateSelector
            mode="single"
            required
            disabled={{ after: new Date() }}
            selected={rateDate}
            onSelect={setRateDate}
          />
          <CurrencyPicker
            className="mx-auto"
            currentCurrency={targetCurrency}
            onCurrencyPick={onChangeTargetCurrency}
          />
        </div>
      </div>
    </AppDrawer>
  );
};
