import type { GroupBalance, User } from '@prisma/client';
import clsx from 'clsx';
import { Info } from 'lucide-react';
import { useMemo } from 'react';

import { UserAvatar } from '~/components/ui/avatar';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface UserWithBalance {
  user: User;
  total: Record<string, bigint>;
  balances: Record<number, Record<string, bigint>>;
}

export const BalanceList: React.FC<{
  balances: GroupBalance[];
  users: User[];
}> = ({ balances, users }) => {
  const userQuery = api.user.me.useQuery();

  const userMap = useMemo(() => {
    const res = users.reduce(
      (acc, user) => {
        acc[user.id] = { user, balances: {}, total: {} };
        return acc;
      },
      {} as Record<number, UserWithBalance>,
    );
    balances
      .filter(({ amount }) => BigMath.abs(amount) > 0)
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
  }, [balances, users]);

  return (
    <>
      <div className="mt-4 flex w-full items-center justify-center space-x-2 text-sm text-gray-500">
        <Info className="size-4" />
        <span>Press on individual balance to initiate settlement</span>
      </div>
      <Accordion type="multiple">
        {Object.values(userMap).map(({ user, total, balances }) => {
          let totalAmount: [string, bigint] = ['', 0n];

          Object.entries(total).forEach(([currency, amount]) => {
            if (BigMath.abs(amount) > BigMath.abs(totalAmount[1])) {
              totalAmount = [currency, amount];
            }
          });

          return (
            <AccordionItem key={user.id} value={user.name ?? user.email!}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} />
                  <div className="text-foreground">
                    {user.id === userQuery.data?.id ? 'You' : (user.name ?? user.email)}
                    {Object.values(total).every((amount) => amount === 0n) ? (
                      <span className="text-gray-400"> is settled up</span>
                    ) : (
                      <>
                        <span className="text-gray-400">
                          {' '}
                          {totalAmount[1] > 0 ? 'receive' : 'owe'}
                          {user.id === userQuery.data?.id ? '' : 's'}{' '}
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
                        <div
                          key={friendId}
                          className="mb-4 ml-5 flex cursor-pointer items-center gap-3 text-sm"
                        >
                          <UserAvatar user={friend} size={20} />
                          <div className="text-foreground">
                            {friend.name ?? friend.email}
                            <span className="text-gray-400">
                              {' '}
                              {amount > 0 ? 'owes' : 'gets back'}{' '}
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
                            <span className="text-foreground">{user.name ?? user.email}</span>
                          </div>
                        </div>
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
