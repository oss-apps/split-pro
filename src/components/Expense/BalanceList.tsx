import type { GroupBalance, User } from '@prisma/client';
import clsx from 'clsx';
import { Info } from 'lucide-react';
import { Fragment, useMemo } from 'react';

import { UserAvatar } from '~/components/ui/avatar';
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
  groupBalances?: GroupBalance[];
  users?: User[];
}> = ({ groupBalances = [], users = [] }) => {
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
      .filter(({ amount }) => 0 < BigMath.abs(amount))
      .forEach((balance) => {
        if (!res[balance.userId]!.balances[balance.firendId]) {
          res[balance.userId]!.balances[balance.firendId] = {};
        }
        const friendBalance = res[balance.userId]!.balances[balance.firendId]!;
        friendBalance[balance.currency] = (friendBalance[balance.currency] ?? 0n) + balance.amount;

        res[balance.userId]!.total[balance.currency] =
          (res[balance.userId]!.total[balance.currency] ?? 0n) + balance.amount;
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
                    {Object.values(total).every((amount) => 0n === amount) ? (
                      <span className="text-gray-400">
                        {' '}
                        {isCurrentUser ? 'are' : 'is'} settled up
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-400">
                          {' '}
                          {0 < totalAmount[1] ? 'get' : 'owe'}
                          {isCurrentUser ? '' : 's'}{' '}
                        </span>
                        <span
                          className={clsx(
                            'text-right',
                            0 < totalAmount[1] ? 'text-emerald-500' : 'text-orange-600',
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
                    <Fragment key={friendId}>
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
                                {0 > amount ? 'get' : 'owe'}
                                {friend.id === userQuery.data?.id ? '' : 's'}{' '}
                              </span>
                              <span
                                className={clsx(
                                  'text-right',
                                  0 < amount ? 'text-emerald-500' : 'text-orange-600',
                                )}
                              >
                                {toUIString(amount)} {currency}
                              </span>
                              <span className="text-gray-400"> {0 < amount ? 'to' : 'from'} </span>
                              <span className="text-foreground">
                                {displayName(user, userQuery.data?.id)}
                              </span>
                            </div>
                          </div>
                        </GroupSettleUp>
                      ))}
                    </Fragment>
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
