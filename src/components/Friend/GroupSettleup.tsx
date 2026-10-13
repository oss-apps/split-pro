import { SplitType, type User } from '@prisma/client';
import { ArrowRightIcon } from 'lucide-react';
import React, { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { EntityAvatar } from '../ui/avatar';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { useSession } from 'next-auth/react';
import { isExpression, isValidExpressionResult, safeEvaluateExpression } from '~/utils/expression';

export const GroupSettleUp: React.FC<{
  amount: bigint;
  currency: string;
  friend: User;
  user: User;
  children: ReactNode;
  groupId: number;
}> = ({ amount: _amount, currency, friend, user, children, groupId }) => {
  const { data } = useSession();
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [amount, setAmount] = useState<bigint>(BigMath.abs(_amount));
  const [amountStr, setAmountStr] = useState(getCurrencyHelpersCached(currency).toUIString(amount));
  const [open, setOpen] = useState(false);

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

  const sender = 0 > _amount ? user : friend;
  const receiver = 0 > _amount ? friend : user;
  const amountIsExpression = isExpression(amountStr);
  const evaluatedExpression = amountIsExpression ? safeEvaluateExpression(amountStr) : null;
  const evaluatedExpressionAmount = isValidExpressionResult(evaluatedExpression)
    ? getCurrencyHelpersCached(currency).expressionResultToBigInt(evaluatedExpression)
    : 0n;
  const canSave = amountIsExpression ? 0n < evaluatedExpressionAmount : 0n < amount;

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
      finalAmount = getCurrencyHelpersCached(currency).expressionResultToBigInt(evaluated);
    }

    if (0n === finalAmount) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: currency,
        amount: finalAmount,
        splitType: SplitType.SETTLEMENT,
        groupId,
        participants: [
          {
            userId: sender.id,
            amount: finalAmount,
          },
          {
            userId: receiver.id,
            amount: -finalAmount,
          },
        ],
        paidBy: sender.id,
        category: DEFAULT_CATEGORY,
      },
      {
        onSuccess: () => {
          setOpen(false);
          utils.group.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [
    sender,
    receiver,
    amount,
    amountStr,
    utils,
    addExpenseMutation,
    currency,
    groupId,
    t,
    getCurrencyHelpersCached,
  ]);

  return (
    <AppDrawer
      trigger={children}
      leftAction={t('actions.back')}
      title={t('ui.settlement')}
      actionTitle={t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={!canSave}
      className="h-[70vh]"
      open={open}
      onOpenChange={setOpen}
      shouldCloseOnAction={false}
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <EntityAvatar entity={sender} />
            <ArrowRightIcon className="h-6 w-6 text-gray-600" />
            <EntityAvatar entity={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            {displayName(sender, data?.user.id)}{' '}
            {t(`ui.expense.${sender.id === data?.user.id ? 'you' : 'user'}.pay`)}{' '}
            {displayName(receiver, data?.user.id)}
          </p>
        </div>
        <CurrencyInput
          currency={currency}
          strValue={amountStr}
          className="mx-auto mt-4 w-[150px] text-center text-lg"
          onValueChange={onCurrencyInputValueChange}
        />
      </div>
    </AppDrawer>
  );
};
