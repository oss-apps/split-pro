import { SplitType, type User } from '@prisma/client';
import { ArrowRightIcon } from 'lucide-react';
import React, { type ReactNode, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useCommonTranslation } from '~/hooks/useCommonTranslation';
import { api } from '~/utils/api';
import { BigMath, toSafeBigInt } from '~/utils/numbers';

import { UserAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Input } from '../ui/input';

export const GroupSettleUp: React.FC<{
  amount: bigint;
  currency: string;
  friend: User;
  user: User;
  children: ReactNode;
  groupId: number;
}> = ({ amount, currency, friend, user, children, groupId }) => {
  const { displayName, t } = useCommonTranslation(['friend_details']);
  const [amountStr, setAmountStr] = useState((Number(BigMath.abs(amount)) / 100).toString());

  const onChangeAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountStr(value);
  }, []);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  const sender = 0 > amount ? user : friend;
  const receiver = 0 > amount ? friend : user;

  const saveExpense = useCallback(() => {
    if (0n === toSafeBigInt(amountStr)) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: t('ui.settle_up_name'),
        currency: currency,
        amount: toSafeBigInt(amountStr),
        splitType: SplitType.SETTLEMENT,
        groupId,
        participants: [
          {
            userId: sender.id,
            amount: toSafeBigInt(amountStr),
          },
          {
            userId: receiver.id,
            amount: -toSafeBigInt(amountStr),
          },
        ],
        paidBy: sender.id,
        category: 'general',
      },
      {
        onSuccess: () => {
          utils.group.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('ui.settle_up_details.errors.saving_expense'));
        },
      },
    );
  }, [sender, receiver, amountStr, utils, addExpenseMutation, currency, groupId, t]);

  return (
    <AppDrawer
      trigger={children}
      leftAction=""
      title={t('ui.settle_up_details.settlement')}
      className="h-[70vh]"
      actionTitle=""
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <UserAvatar user={sender} />
            <ArrowRightIcon className="h-6 w-6 text-gray-600" />
            <UserAvatar user={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            {displayName(sender)} {t('ui.settle_up_details.pays')} {displayName(receiver)}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <p className="text-lg">{currency}</p>
          <Input
            type="number"
            value={amountStr}
            inputMode="decimal"
            className="mx-auto w-[150px] text-lg"
            onChange={onChangeAmount}
          />
        </div>
      </div>
      <div className="mt-8 hidden items-center justify-center gap-4 px-2 lg:flex">
        <DrawerClose>
          <Button size="sm" className="mx-auto" onClick={saveExpense}>
            {t('ui.settle_up_details.save')}
          </Button>
        </DrawerClose>
      </div>
    </AppDrawer>
  );
};
