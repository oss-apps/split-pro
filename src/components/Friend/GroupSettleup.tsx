import { SplitType, type User } from '@prisma/client';
import { ArrowRightLeftIcon } from 'lucide-react';
import React, { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { CurrencyPicker } from '~/components/AddExpense/CurrencyPicker';
import { parseCurrencyCode } from '~/lib/currency';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { Button } from '../ui/button';
import { EntityAvatar } from '../ui/avatar';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { useSession } from 'next-auth/react';

export const GroupSettleUp: React.FC<{
  amount: bigint;
  currency: string;
  friend: User;
  user: User;
  children: ReactNode;
  groupId: number;
  allowCurrencyChange?: boolean;
}> = ({
  amount: _amount,
  currency: initialCurrency,
  friend,
  user,
  children,
  groupId,
  allowCurrencyChange,
}) => {
  const [currency, setCurrency] = useState(initialCurrency);
  const { data } = useSession();
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [amount, setAmount] = useState<bigint>(BigMath.abs(_amount));
  const [amountStr, setAmountStr] = useState(getCurrencyHelpersCached(currency).toUIString(amount));

  const onCurrencyInputValueChange = React.useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
    },
    [],
  );

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const [isUserPaying, setIsUserPaying] = useState(0n >= _amount);
  const sender = isUserPaying ? user : friend;
  const receiver = isUserPaying ? friend : user;
  const payerRole = sender.id === data?.user.id ? 'you' : 'other';
  const receiverRole = receiver.id === data?.user.id ? 'you' : 'other';
  const paymentText =
    payerRole === 'you'
      ? t('ui.expense.statements.you_pay_user', { user: displayName(receiver) })
      : receiverRole === 'you'
        ? t('ui.expense.statements.user_pays_you', { user: displayName(sender) })
        : t('ui.expense.statements.user_pays_user', {
            payer: displayName(sender),
            receiver: displayName(receiver),
          });

  const saveExpense = React.useCallback(() => {
    if (0n >= amount) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        groupId,
        participants: [
          {
            userId: sender.id,
            amount,
          },
          {
            userId: receiver.id,
            amount: -amount,
          },
        ],
        paidBy: sender.id,
        category: DEFAULT_CATEGORY,
      },
      {
        onSuccess: () => {
          utils.group.invalidate().catch(console.error);
          utils.user.invalidate().catch(console.error);
          utils.expense.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [sender, receiver, amount, utils, addExpenseMutation, currency, groupId, t]);

  return (
    <AppDrawer
      trigger={children}
      onTriggerClick={() => {
        setCurrency(initialCurrency);
        setAmount(BigMath.abs(_amount));
        setAmountStr(getCurrencyHelpersCached(initialCurrency).toUIString(BigMath.abs(_amount)));
        setIsUserPaying(0n >= _amount);
      }}
      leftAction={t('actions.back')}
      title={t('ui.settlement')}
      actionTitle={t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={0n >= amount}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <EntityAvatar entity={sender} />
            <Button
              variant="outline"
              size="icon"
              aria-label={t('actions.reverse_direction')}
              title={t('actions.reverse_direction')}
              onClick={() => setIsUserPaying((paying) => !paying)}
            >
              <ArrowRightLeftIcon className="size-4" />
            </Button>
            <EntityAvatar entity={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">{paymentText}</p>
        </div>
        {allowCurrencyChange ? (
          <CurrencyPicker
            currentCurrency={parseCurrencyCode(currency)}
            onCurrencyPick={(selected) => {
              if (!selected) {
                return;
              }
              setCurrency(selected);
              setAmount(0n);
              setAmountStr(getCurrencyHelpersCached(selected).toUIString(0n));
            }}
          />
        ) : null}
        <CurrencyInput
          aria-label={t('ui.transfer_amount')}
          currency={currency}
          strValue={amountStr}
          className="mx-auto mt-4 w-[150px] text-center text-lg"
          onValueChange={onCurrencyInputValueChange}
        />
      </div>
    </AppDrawer>
  );
};
