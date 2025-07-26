import { type Balance, SplitType, type User } from '@prisma/client';
import { ArrowRightIcon } from 'lucide-react';
import { type User as NextUser } from 'next-auth';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_CATEGORY } from '~/lib/category';
import { api } from '~/utils/api';
import { BigMath, toSafeBigInt, toUIString } from '~/utils/numbers';

import { FriendBalance } from './FirendBalance';
import { UserAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { AppDrawer, DrawerClose } from '../ui/drawer';
import { Input } from '../ui/input';

export const SettleUp: React.FC<{
  balances: Balance[];
  friend: User;
  currentUser: NextUser;
}> = ({ balances, friend, currentUser }) => {
  const [balanceToSettle, setBalanceToSettle] = useState<Balance | undefined>(
    1 < balances.length ? undefined : balances[0],
  );
  const [amount, setAmount] = useState<string>(
    1 < balances.length ? '' : toUIString(BigMath.abs(balances[0]?.amount ?? 0n)),
  );

  const isCurrentUserPaying = 0 > (balanceToSettle?.amount ?? 0);

  function onSelectBalance(balance: Balance) {
    setBalanceToSettle(balance);
    setAmount(toUIString(BigMath.abs(balance.amount)));
  }

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  function saveExpense() {
    if (!balanceToSettle || !amount || !parseFloat(amount)) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: 'Settle up',
        currency: balanceToSettle.currency,
        amount: toSafeBigInt(amount),
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: currentUser.id,
            amount: isCurrentUserPaying ? toSafeBigInt(amount) : -toSafeBigInt(amount),
          },
          {
            userId: friend.id,
            amount: isCurrentUserPaying ? -toSafeBigInt(amount) : toSafeBigInt(amount),
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
          toast.error('Error while saving expense');
        },
      },
    );
  }

  return (
    <AppDrawer
      trigger={
        <Button
          size="sm"
          className="flex w-[150px] items-center gap-2 rounded-md border bg-cyan-500 px-3 text-sm font-normal text-black focus:bg-cyan-600 focus:ring-0 focus-visible:outline-hidden lg:w-[180px]"
          disabled={!balances.length}
        >
          Settle up
        </Button>
      }
      disableTrigger={!balances?.length}
      leftAction={''}
      leftActionOnClick={() => {
        setBalanceToSettle(undefined);
      }}
      title=""
      className="h-[70vh]"
      actionTitle=""
      shouldCloseOnAction
    >
      <div className="flex items-center justify-between px-2">
        <div>
          {balanceToSettle &&
            (1 < balances.length ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-cyan-500 lg:hidden"
                onClick={() => setBalanceToSettle(undefined)}
              >
                Back
              </Button>
            ) : (
              <DrawerClose>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-cyan-500 lg:hidden"
                  onClick={() => (1 < balances.length ? setBalanceToSettle(undefined) : null)}
                >
                  Back
                </Button>
              </DrawerClose>
            ))}
        </div>
        <div className="mt-4 mb-2 text-center">
          {balanceToSettle ? 'Settle up' : 'Select currency'}
        </div>
        {balanceToSettle && (
          <DrawerClose>
            <Button
              size="sm"
              variant="ghost"
              className="mx-auto text-cyan-500 lg:hidden"
              onClick={() => saveExpense()}
            >
              Save
            </Button>
          </DrawerClose>
        )}
      </div>
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
              <UserAvatar user={isCurrentUserPaying ? currentUser : friend} />
              <ArrowRightIcon className="h-6 w-6 text-gray-600" />
              <UserAvatar user={isCurrentUserPaying ? friend : currentUser} />
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">
              {isCurrentUserPaying
                ? `You're paying ${friend.name ?? friend.email}`
                : `${friend.name ?? friend.email} is paying you`}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-lg">{balanceToSettle.currency}</p>
            <Input
              type="number"
              value={amount}
              inputMode="decimal"
              className="mx-auto w-[150px] text-lg"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
      )}
      <div className="mt-8 hidden items-center justify-center gap-4 px-2 lg:flex">
        <div>
          {balanceToSettle &&
            (1 < balances.length ? (
              <Button size="sm" variant="secondary" onClick={() => setBalanceToSettle(undefined)}>
                Back
              </Button>
            ) : (
              <DrawerClose>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => (1 < balances.length ? setBalanceToSettle(undefined) : null)}
                >
                  Back
                </Button>
              </DrawerClose>
            ))}
        </div>
        {balanceToSettle && (
          <DrawerClose>
            <Button size="sm" className="mx-auto" onClick={() => saveExpense()}>
              Save
            </Button>
          </DrawerClose>
        )}
      </div>
    </AppDrawer>
  );
};
