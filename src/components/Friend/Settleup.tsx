import { SplitType, type User } from '@prisma/client';
import { ArrowRightLeftIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { CurrencyPicker } from '~/components/AddExpense/CurrencyPicker';
import { parseCurrencyCode } from '~/lib/currency';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { useSession } from 'next-auth/react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import type { MinimalBalance } from '~/types/balance.types';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { FriendBalance } from './FriendBalance';

export const SettleUp: React.FC<
  React.PropsWithChildren<{
    balances?: MinimalBalance[];
    friend: User;
  }>
> = ({ children, balances, friend }) => {
  const { t } = useTranslationWithUtils();
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

  return (
    <SettleUpWithBalances
      balances={
        balances.length
          ? balances
          : [
              {
                friendId: friend.id,
                currency: currentUser.defaultCurrency ?? currentUser.currency,
                amount: 0n,
                groupId: null,
              },
            ]
      }
      allowCurrencyChange={!balances.length}
      friend={friend}
      currentUser={currentUser}
      trigger={children}
    />
  );
};

const SettleUpWithBalances: React.FC<{
  balances: MinimalBalance[];
  allowCurrencyChange: boolean;
  friend: User;
  currentUser: NonNullable<ReturnType<typeof useSession>['data']>['user'];
  trigger: React.ReactNode;
}> = ({ balances, allowCurrencyChange, friend, currentUser, trigger }) => {
  const { t, displayName, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [balanceToSettle, setBalanceToSettle] = useState<MinimalBalance | undefined>(
    1 < balances.length ? undefined : balances[0],
  );
  const [amount, setAmount] = useState<bigint>(
    1 < balances.length ? 0n : BigMath.abs(balances[0]?.amount ?? 0n),
  );
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(balanceToSettle?.currency ?? '').toUIString(amount),
  );

  const [isCurrentUserPaying, setIsCurrentUserPaying] = useState(
    0n >= (balanceToSettle?.amount ?? 0n),
  );

  const onSelectBalance = (balance: MinimalBalance) => {
    setBalanceToSettle(balance);
    setIsCurrentUserPaying(0n >= balance.amount);
    setAmount(BigMath.abs(balance.amount));
    setAmountStr(
      getCurrencyHelpersCached(balance.currency).toUIString(BigMath.abs(balance.amount)),
    );
  };

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const saveExpense = React.useCallback(() => {
    if (!balanceToSettle || 0n >= amount || !currentUser) {
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
        groupId: balanceToSettle.groupId,
      },
      {
        onSuccess: () => {
          utils.user.invalidate().catch(console.error);
          utils.expense.invalidate().catch(console.error);
          utils.group.invalidate().catch(console.error);
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
      trigger={trigger}
      onTriggerClick={() => {
        if (1 === balances.length && balances[0]) {
          onSelectBalance(balances[0]);
          return;
        }
        setBalanceToSettle(undefined);
      }}
      leftAction={t('actions.back')}
      leftActionOnClick={1 < balances.length ? onBackClick : undefined}
      shouldCloseOnLeftAction={1 >= balances.length}
      title={balanceToSettle ? t('ui.settle_up_name') : t('ui.select_balance')}
      className="h-[70vh]"
      actionTitle={t('actions.save')}
      actionDisabled={!balanceToSettle || 0n >= amount}
      actionOnClick={saveExpense}
      shouldCloseOnAction
    >
      {!balanceToSettle ? (
        <div>
          {balances.map((b) => (
            <div
              key={`${b.friendId}-${b.currency}-${b.groupId ?? 'null'}`}
              onClick={() => onSelectBalance(b)}
              className="cursor-pointer px-4 py-2"
            >
              <FriendBalance user={friend} balance={b} groupName={b.groupName} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-5">
              <EntityAvatar entity={isCurrentUserPaying ? currentUser : friend} />
              <Button
                variant="outline"
                size="icon"
                aria-label={t('actions.reverse_direction')}
                title={t('actions.reverse_direction')}
                onClick={() => setIsCurrentUserPaying((paying) => !paying)}
              >
                <ArrowRightLeftIcon className="size-4" />
              </Button>
              <EntityAvatar entity={isCurrentUserPaying ? friend : currentUser} />
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">
              {isCurrentUserPaying
                ? t('ui.expense.statements.you_pay_user', { user: displayName(friend) })
                : t('ui.expense.statements.user_pays_you', { user: displayName(friend) })}
            </p>
            {balanceToSettle.groupName ? (
              <p className="mt-1 text-center text-xs text-gray-500">{balanceToSettle.groupName}</p>
            ) : null}
          </div>
          {allowCurrencyChange ? (
            <CurrencyPicker
              currentCurrency={parseCurrencyCode(balanceToSettle.currency)}
              onCurrencyPick={(currency) => {
                if (!currency) {
                  return;
                }
                setBalanceToSettle({ ...balanceToSettle, currency });
                setAmount(0n);
                setAmountStr(getCurrencyHelpersCached(currency).toUIString(0n));
              }}
            />
          ) : null}
          <CurrencyInput
            aria-label={t('ui.transfer_amount')}
            currency={balanceToSettle.currency}
            strValue={amountStr}
            className="mx-auto mt-4 w-[150px] text-center text-lg"
            onValueChange={onCurrencyInputValueChange}
          />
        </div>
      )}
    </AppDrawer>
  );
};
