import clsx from 'clsx';
import { Info } from 'lucide-react';
import { useMemo } from 'react';

import { UserAvatar } from '~/components/ui/avatar';
import type { User } from '~/prisma/client';
import { type getAllBalancesForGroup } from '~/prisma/client/sql';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';
import { displayName } from '~/utils/strings';

import { GroupSettleUp } from '../Friend/GroupSettleup';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface UserWithBalance {
  user: User;
  total: Record<string, bigint>;
  balances: Record<number, Record<string, bigint>>;
}

export const BalanceList: React.FC<{
  groupBalances: getAllBalancesForGroup.Result[];
  users: User[];
}> = ({ groupBalances, users }) => {
  const userQuery = api.user.me.useQuery();

  const userMap = useMemo(() => {
    const res = users.reduce(
      (acc, user) => {
        acc[user.id] = { user, balances: {}, total: {} };
        return acc;
      },
      {} as Record<number, UserWithBalance>,
    );
    groupBalances
      .filter(({ amount }) => amount != null && BigMath.abs(amount) > 0)
      .forEach((balance) => {
        if (!res[balance.paidBy]!.balances[balance.borrowedBy]) {
          res[balance.paidBy]!.balances[balance.borrowedBy] = {};
        }
        const friendBalance = res[balance.paidBy]!.balances[balance.borrowedBy]!;
        friendBalance[balance.currency] =
          (friendBalance[balance.currency] ?? 0n) + (balance.amount ?? 0n);

        res[balance.paidBy]!.total[balance.currency] =
          (res[balance.paidBy]!.total[balance.currency] ?? 0n) + (balance.amount ?? 0n);
      });

    return res;
  }, [groupBalances, users]);

  return (
    <>
      <div className="mt-4 flex w-full items-center justify-center space-x-2 text-sm text-gray-500">
        <Info className="size-4" />
        <span>Press on individual balance to initiate settlement</span>
      </div>
      <Accordion type="multiple">
        {Object.values(userMap).map(({ user, total, balances }) => {
          let totalAmount: [string, bigint] = ['', 0n];
          const isCurrentUser = userQuery.data?.id === user.id;

          Object.entries(total).forEach(([currency, amount]) => {
            if (BigMath.abs(amount) > BigMath.abs(totalAmount[1])) {
              totalAmount = [currency, amount];
            }
          });

          return (
            <AccordionItem key={user.id} value={displayName(user)}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <div className="text-foreground">
                    {displayName(user, userQuery.data?.id)}
                    {Object.values(total).every((amount) => amount === 0n) ? (
                      <span className="text-gray-400">
                        {' '}
                        {isCurrentUser ? 'are' : 'is'} settled up
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-400">
                          {' '}
                          {totalAmount[1] > 0 ? 'get' : 'owe'}
                          {isCurrentUser ? '' : 's'}{' '}
                        </span>
                        <span
                          className={clsx(
                            'text-right',
                            totalAmount[1] > 0 ? 'text-emerald-500' : 'text-orange-600',
                          )}
                        >
                          {toUIString(totalAmount[1])} {totalAmount[0]}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {Object.entries(balances).map(([friendId, perFriendBalances]) => {
                  const friend = userMap[+friendId]!.user;

                  return (
                    <>
                      {Object.entries(perFriendBalances).map(([currency, amount]) => (
                        <GroupSettleUp
                          key={friendId + currency}
                          friend={friend}
                          user={user}
                          amount={amount}
                          currency={currency}
                          groupId={groupBalances[0]!.groupId}
                        >
                          <div className="mb-4 ml-5 flex cursor-pointer items-center gap-3 text-sm">
                            <UserAvatar user={friend} size={20} />
                            <div className="text-foreground">
                              {displayName(friend, userQuery.data?.id)}
                              <span className="text-gray-400">
                                {' '}
                                {amount < 0 ? 'get' : 'owe'}
                                {friend.id === userQuery.data?.id ? '' : 's'}{' '}
                              </span>
                              <span
                                className={clsx(
                                  'text-right',
                                  amount > 0 ? 'text-emerald-500' : 'text-orange-600',
                                )}
                              >
                                {toUIString(amount)} {currency}
                              </span>
                              <span className="text-gray-400"> {amount > 0 ? 'to' : 'from'} </span>
                              <span className="text-foreground">
                                {displayName(user, userQuery.data?.id)}
                              </span>
                            </div>
                          </div>
                        </GroupSettleUp>
                      ))}
                    </>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};
