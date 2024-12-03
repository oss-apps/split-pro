import React from 'react';
import { Button } from '../ui/button';
import { AppDrawer, Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '../ui/drawer';
import { type User, type Balance, SplitType } from '@prisma/client';
import { type User as NextUser } from 'next-auth';
import { FriendBalance } from './FirendBalance';
import { Input } from '../ui/input';
import { UserAvatar } from '../ui/avatar';
import { ArrowRightIcon } from 'lucide-react';
import { api } from '~/utils/api';
import { toast } from 'sonner';
import { toFixedNumber } from '~/utils/numbers';

export const SettleUp: React.FC<{
  balances: Array<Balance>;
  friend: User;
  currentUser: NextUser;
}> = ({ balances, friend, currentUser }) => {
  const [balanceToSettle, setBallanceToSettle] = React.useState<Balance | undefined>(
    balances.length > 1 ? undefined : balances[0],
  );
  const [amount, setAmount] = React.useState<string>(
    balances.length > 1 ? '' : toFixedNumber(Math.abs(balances[0]?.amount ?? 0)).toString(),
  );

  const isCurrentUserPaying = (balanceToSettle?.amount ?? 0) < 0;

  function onSelectBalance(balance: Balance) {
    setBallanceToSettle(balance);
    setAmount(toFixedNumber(Math.abs(balance.amount)).toString());
  }

  const addExpenseMutation = api.user.addOrEditExpense.useMutation();
  const utils = api.useUtils();

  function saveExpense() {
    if (!balanceToSettle || !amount || !parseFloat(amount)) {
      return;
    }

    addExpenseMutation.mutate(
      {
        name: 'Settle up',
        currency: balanceToSettle.currency,
        amount: parseFloat(amount),
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: currentUser.id,
            amount: isCurrentUserPaying ? parseFloat(amount) : -parseFloat(amount),
          },
          {
            userId: friend.id,
            amount: isCurrentUserPaying ? -parseFloat(amount) : parseFloat(amount),
          },
        ],
        paidBy: isCurrentUserPaying ? currentUser.id : friend.id,
        category: 'general',
      },
      {
        onSuccess: () => {
          utils.user.invalidate().catch(console.error);
        },
        onError: (error) => {
          toast.info('Error while saving expense');
        },
      },
    );
  }

  return (
    <>
      <AppDrawer
        trigger={
          <Button
            size="sm"
            className="flex w-[150px] items-center gap-2 rounded-md border bg-cyan-500 px-3  text-sm font-normal text-black focus:bg-cyan-600 focus:ring-0 focus-visible:outline-none lg:w-[180px] "
            disabled={!balances.length}
          >
            Settle up
          </Button>
        }
        disableTrigger={!balances?.length}
        leftAction={''}
        leftActionOnClick={() => {
          setBallanceToSettle(undefined);
        }}
        title=""
        className="h-[70vh]"
        actionTitle=""
        shouldCloseOnAction
      >
        <div>
          <div className="flex items-center justify-between px-2">
            <div>
              {balanceToSettle ? (
                balances.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className=" text-cyan-500 lg:hidden"
                    onClick={() => setBallanceToSettle(undefined)}
                  >
                    Back
                  </Button>
                ) : (
                  <DrawerClose>
                    <Button
                      size="sm"
                      variant="ghost"
                      className=" text-cyan-500 lg:hidden"
                      onClick={() => (balances.length > 1 ? setBallanceToSettle(undefined) : null)}
                    >
                      Back
                    </Button>
                  </DrawerClose>
                )
              ) : (
                <div></div>
              )}
            </div>
            <div className="mb-2 mt-4 text-center">
              {balanceToSettle ? 'Settle up' : 'Select currency'}
            </div>
            {balanceToSettle ? (
              <DrawerClose>
                <Button
                  size="sm"
                  variant="ghost"
                  className=" mx-auto text-cyan-500 lg:hidden"
                  onClick={() => saveExpense()}
                >
                  Save
                </Button>
              </DrawerClose>
            ) : (
              <div></div>
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
              <div className="mt-3 flex  items-center gap-2">
                <p className="text-lg">{balanceToSettle.currency}</p>
                <Input
                  type="number"
                  value={amount}
                  inputMode="decimal"
                  className="mx-auto  w-[150px] text-lg"
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="mt-8 hidden items-center justify-center gap-4 px-2 lg:flex">
            <div>
              {balanceToSettle ? (
                balances.length > 1 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setBallanceToSettle(undefined)}
                  >
                    Back
                  </Button>
                ) : (
                  <DrawerClose>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => (balances.length > 1 ? setBallanceToSettle(undefined) : null)}
                    >
                      Back
                    </Button>
                  </DrawerClose>
                )
              ) : (
                <div></div>
              )}
            </div>
            {balanceToSettle ? (
              <DrawerClose>
                <Button size="sm" className=" mx-auto " onClick={() => saveExpense()}>
                  Save
                </Button>
              </DrawerClose>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </AppDrawer>
    </>
  );
};
