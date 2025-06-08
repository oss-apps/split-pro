import type { GroupBalance, User } from '@prisma/client';
import clsx from 'clsx';

import { UserAvatar } from '~/components/ui/avatar';
import { BigMath, toUIString } from '~/utils/numbers';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { getAllBalancesForGroup } from '@prisma/client/sql';

interface UserWithBalance {
  user: User;
  total: Record<string, bigint>;
  balances: Record<number, Record<string, bigint>>;
}

export const BalanceList: React.FC<{
  balances: getAllBalancesForGroup.Result[];
  users: User[];
}> = ({ balances, users }) => {
  const userMap = users.reduce(
    (acc, user) => {
      acc[user.id] = { user, balances: {}, total: {} };
      return acc;
    },
    {} as Record<number, UserWithBalance>,
  );

  balances
    .filter(({ amount }) => amount != null && BigMath.abs(amount) > 0)
    .forEach((balance) => {
      if (!userMap[balance.paidBy]!.balances[balance.borrowedBy]) {
        userMap[balance.paidBy]!.balances[balance.borrowedBy] = {};
      }
      const friendBalance = userMap[balance.paidBy]!.balances[balance.borrowedBy]!;
      friendBalance[balance.currency] =
        (friendBalance[balance.currency] ?? 0n) + (balance.amount != null ? balance.amount : 0n);

      userMap[balance.paidBy]!.total[balance.currency] =
        (userMap[balance.paidBy]!.total[balance.currency] ?? 0n) +
        (balance.amount != null ? balance.amount : 0n);
    });

  return (
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
                  {user.name ?? user.email}
                  {Object.values(total).every((amount) => amount === 0n) ? (
                    <span className="text-gray-400"> is settled up</span>
                  ) : (
                    <>
                      <span className="text-gray-400">
                        {' '}
                        {totalAmount[1] > 0 ? 'gets back' : 'owes'}{' '}
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
                      <div key={friendId} className="mb-2 ml-5 flex items-center gap-3 text-sm">
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
  );
};
