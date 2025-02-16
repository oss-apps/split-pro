import { GroupBalance, User } from '@prisma/client';
import Link from 'next/link';
import { UserAvatar } from '~/components/ui/avatar';
import clsx from 'clsx';
import { toUIString } from '~/utils/numbers';
import { Accordion, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface UserWithBalance {
  user: User;
  total: Record<string, number>;
  balances: {
    [friendId: number]: Record<string, number>;
  };
}

export const BalanceList: React.FC<{
  balances: GroupBalance[];
  users: User[];
  userId: number;
  isLoading?: boolean;
}> = ({ balances, users, userId, isLoading }) => {
  const userMap = users.reduce(
    (acc, user) => {
      acc[user.id] = { user, balances: {}, total: {} };
      return acc;
    },
    {} as Record<number, UserWithBalance>,
  );

  balances
    .filter(({ amount }) => Math.abs(amount) > 0)
    .forEach((balance) => {
      if (!userMap[balance.userId]!.balances[balance.firendId]) {
        userMap[balance.userId]!.balances[balance.firendId] = {};
      }
      const friendBalance = userMap[balance.userId]!.balances[balance.firendId]!;
      friendBalance[balance.currency] = (friendBalance[balance.currency] ?? 0) + balance.amount;

      userMap[balance.userId]!.total[balance.currency] =
        (userMap[balance.userId]!.total[balance.currency] ?? 0) + balance.amount;
    });

  return (
    <Accordion type="multiple">
      {Object.values(userMap).map(({ user, total }) => {
        let totalAmount: [string, number] = ['', 0];

        Object.entries(total).forEach(([currency, amount]) => {
          if (Math.abs(amount) > Math.abs(totalAmount[1])) {
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
                  {Object.values(total).every((amount) => amount === 0) ? (
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
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
