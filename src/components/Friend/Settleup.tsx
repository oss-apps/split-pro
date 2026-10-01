import { SplitType, type User } from '@prisma/client';
import { ArrowRightIcon } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

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
import { isExpression, isValidExpressionResult, safeEvaluateExpression } from '~/utils/expression';

export const SettleUp: React.FC<
  React.PropsWithChildren<{
    balances?: MinimalBalance[];
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

  const [balanceToSettle, setBalanceToSettle] = useState<MinimalBalance | undefined>(
    1 < balances.length ? undefined : balances[0],
  );
  const [amount, setAmount] = useState<bigint>(
    1 < balances.length ? 0n : BigMath.abs(balances[0]?.amount ?? 0n),
  );
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(balanceToSettle?.currency ?? '').toUIString(amount),
  );
  const [open, setOpen] = useState(false);

  const isCurrentUserPaying = 0 > (balanceToSettle?.amount ?? 0);
  const amountIsExpression = isExpression(amountStr);
  const evaluatedExpression = amountIsExpression ? safeEvaluateExpression(amountStr) : null;
  const evaluatedExpressionAmount = isValidExpressionResult(evaluatedExpression)
    ? getCurrencyHelpersCached(balanceToSettle?.currency ?? 'USD').expressionResultToBigInt(
        evaluatedExpression,
      )
    : 0n;
  const canSave = amountIsExpression ? 0n < evaluatedExpressionAmount : 0n < amount;

  function onSelectBalance(balance: MinimalBalance) {
    setBalanceToSettle(balance);
    setAmount(BigMath.abs(balance.amount));
    setAmountStr(
      getCurrencyHelpersCached(balance.currency).toUIString(BigMath.abs(balance.amount)),
    );
  }

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const saveExpense = React.useCallback(() => {
    let finalAmount = amount;
    if (isExpression(amountStr)) {
      const evaluated = safeEvaluateExpression(amountStr);
      if (null === evaluated) {
        toast.error(t('errors.invalid_expression'));
        return;
      }
      if (0n > evaluated.numerator) {
        toast.error(t('errors.negative_settlement_amount'));
        return;
      }
      finalAmount = getCurrencyHelpersCached(
        balanceToSettle?.currency ?? 'USD',
      ).expressionResultToBigInt(evaluated);
    }

    if (!balanceToSettle || 0n === finalAmount || !currentUser) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: balanceToSettle.currency,
        amount: finalAmount,
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: currentUser.id,
            amount: isCurrentUserPaying ? finalAmount : -finalAmount,
          },
          {
            userId: friend.id,
            amount: isCurrentUserPaying ? -finalAmount : finalAmount,
          },
        ],
        paidBy: isCurrentUserPaying ? currentUser.id : friend.id,
        category: DEFAULT_CATEGORY,
        groupId: balanceToSettle.groupId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          utils.user.invalidate().catch(console.error);
          utils.expense.invalidate().catch(console.error);
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
    amountStr,
    currentUser,
    isCurrentUserPaying,
    friend,
    addExpenseMutation,
    utils,
    t,
    getCurrencyHelpersCached,
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
      title={balanceToSettle ? t('ui.settle_up_name') : t('ui.select_balance')}
      className="h-[70vh]"
      actionTitle={t('actions.save')}
      actionDisabled={!balanceToSettle || !canSave}
      actionOnClick={saveExpense}
      open={open}
      onOpenChange={setOpen}
      shouldCloseOnAction={false}
    >
      {!balanceToSettle ? (
        <div>
          {balances?.map((b) => (
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
              <ArrowRightIcon className="h-6 w-6 text-gray-600" />
              <EntityAvatar entity={isCurrentUserPaying ? friend : currentUser} />
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">
              {isCurrentUserPaying
                ? `${t('actors.you')} ${t('ui.expense.you.pay')} ${displayName(friend)}`
                : `${displayName(friend)} ${t('ui.expense.user.pay')} ${t('actors.you')}`}
            </p>
            {balanceToSettle.groupName ? (
              <p className="mt-1 text-center text-xs text-gray-500">{balanceToSettle.groupName}</p>
            ) : null}
          </div>
          <CurrencyInput
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
