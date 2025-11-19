import { type BalanceView, SplitType, type User } from '@prisma/client';
import { ArrowRightIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_CATEGORY } from '~/lib/category';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { useSession } from 'next-auth/react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { FriendBalance } from './FriendBalance';

export const SettleUp: React.FC<
  React.PropsWithChildren<{
    balances?: BalanceView[];
    friend: User;
  }>
> = ({ children, balances, friend }) => {
  const { t, displayName, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { data } = useSession();
  const currentUser = data?.user;

  if (!currentUser) {
    return null;
  }

  if (!balances) {
    return (
      <Button size="sm" variant="outline" responsiveIcon disabled>
        <span className="xs:inline hidden">{t('actions.settle_up')}</span>
      </Button>
    );
  }

  const [balanceToSettle, setBalanceToSettle] = useState<BalanceView | undefined>(
    1 < balances.length ? undefined : balances[0],
  );
  const [amount, setAmount] = useState<bigint>(
    1 < balances.length ? 0n : BigMath.abs(balances[0]?.amount ?? 0n),
  );
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(balanceToSettle?.currency ?? '').toUIString(amount),
  );

  const isCurrentUserPaying = 0 > (balanceToSettle?.amount ?? 0);

  function onSelectBalance(balance: BalanceView) {
    setBalanceToSettle(balance);
    setAmount(BigMath.abs(balance.amount));
    setAmountStr(
      getCurrencyHelpersCached(balance.currency).toUIString(BigMath.abs(balance.amount)),
    );
  }

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const saveExpense = React.useCallback(() => {
    if (!balanceToSettle || !amount || !currentUser) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: balanceToSettle.currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: currentUser.id,
            amount: isCurrentUserPaying ? amount : -amount,
          },
          {
            userId: friend.id,
            amount: isCurrentUserPaying ? -amount : amount,
          },
        ],
        paidBy: isCurrentUserPaying ? currentUser.id : friend.id,
        category: DEFAULT_CATEGORY,
        groupId: null,
      },
      {
        onSuccess: () => {
          utils.user.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [
    balanceToSettle,
    amount,
    currentUser,
    isCurrentUserPaying,
    friend,
    addExpenseMutation,
    utils,
    t,
  ]);

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

  const onBackClick = React.useCallback(() => {
    if (balanceToSettle) {
      setBalanceToSettle(undefined);
    }
  }, [balanceToSettle]);

  return (
    <AppDrawer
      trigger={children}
      disableTrigger={!balances?.length}
      leftAction={t('actions.back')}
      leftActionOnClick={onBackClick}
      shouldCloseOnLeftAction={false}
      title={balanceToSettle ? t('ui.settle_up_name') : t('ui.select_currency')}
      className="h-[70vh]"
      actionTitle={t('actions.save')}
      actionDisabled={!balanceToSettle || !amount}
      actionOnClick={saveExpense}
      shouldCloseOnAction
    >
      {!balanceToSettle ? (
        <div>
          {balances?.map((b) => (
            <div
              key={`${b.friendId}-${b.currency}`}
              onClick={() => onSelectBalance(b)}
              className="cursor-pointer px-4 py-2"
            >
              <FriendBalance user={friend} balance={b} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-5">
              <EntityAvatar entity={isCurrentUserPaying ? currentUser : friend} />
              <ArrowRightIcon className="h-6 w-6 text-gray-600" />
              <EntityAvatar entity={isCurrentUserPaying ? friend : currentUser} />
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">
              {isCurrentUserPaying
                ? `${t('actors.you')} ${t('ui.expense.you.pay')} ${displayName(friend)}`
                : `${displayName(friend)} ${t('ui.expense.user.pay')} ${t('actors.you')}`}
            </p>
          </div>
          <CurrencyInput
            currency={balanceToSettle.currency}
            bigIntValue={amount}
            strValue={amountStr}
            className="mx-auto mt-4 w-[150px] text-center text-lg"
            onValueChange={onCurrencyInputValueChange}
          />
        </div>
      )}
    </AppDrawer>
  );
};
