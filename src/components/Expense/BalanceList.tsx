import type { GroupBalance, User } from '@prisma/client';
import { clsx } from 'clsx';
import { DollarSign, HandCoins, Info } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { EntityAvatar } from '~/components/ui/avatar';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';

import { GroupSettleUp } from '../Friend/GroupSettleup';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Button } from '../ui/button';
import { CurrencyConversion } from '../Friend/CurrencyConversion';

interface UserWithBalance {
  user: User;
  total: Record<string, bigint>;
  balances: Record<number, Record<string, bigint>>;
}

export const BalanceList: React.FC<{
  groupBalances?: GroupBalance[];
  users?: User[];
}> = ({ groupBalances = [], users = [] }) => {
  const { displayName, t } = useTranslationWithUtils(['expense_details']);
  const userQuery = api.user.me.useQuery();

  const userMap = useMemo(() => {
    const res = users.reduce<Record<number, UserWithBalance>>((acc, user) => {
      acc[user.id] = { user, balances: {}, total: {} };
      return acc;
    }, {});
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
                <EntityAvatar entity={user} />
                <div className="text-foreground">
                  {displayName(user, userQuery.data?.id)}
                  {Object.values(total).every((amount) => 0n === amount) ? (
                    <span className="text-gray-400">
                      {' '}
                      {isCurrentUser
                        ? t('ui.balance_list.are_settled_up')
                        : t('ui.balance_list.is_settled_up')}
                    </span>
                  ) : (
                    <>
                      <span className="text-gray-400">
                        {' '}
                        {t(
                          `ui.expense.${isCurrentUser ? 'you' : 'user'}.${0 < totalAmount[1] ? 'lent' : 'owe'}`,
                          { ns: 'common' },
                        )}{' '}
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
                      <div
                        key={friendId + currency}
                        className="flex h-12 w-full items-center justify-between border-t-2"
                      >
                        <div className="ml-5 flex cursor-pointer items-center gap-3 text-sm">
                          <EntityAvatar entity={friend} size={20} />
                          <div className="text-foreground">
                            {displayName(friend, userQuery.data?.id)}
                            <span className="text-gray-400">
                              {' '}
                              {t(
                                `ui.expense.${friend.id === userQuery.data?.id ? 'you' : 'user'}.${0 > amount ? 'get' : 'pay'}`,
                                { ns: 'common' },
                              )}{' '}
                            </span>
                            <span
                              className={clsx(
                                'text-right',
                                0 < amount ? 'text-emerald-500' : 'text-orange-600',
                              )}
                            >
                              {toUIString(amount)} {currency}
                            </span>
                            <span className="xs:inline hidden text-gray-400">
                              {' '}
                              {t(`ui.expense.${0 < amount ? 'to' : 'from'}`, {
                                ns: 'common',
                              })}{' '}
                            </span>
                            <span className="xs:inline text-foreground hidden">
                              {displayName(user, userQuery.data?.id, 'accusativus')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <GroupSettleUp
                            friend={friend}
                            user={user}
                            amount={amount}
                            currency={currency}
                            groupId={groupBalances[0]!.groupId}
                          >
                            <Button size="icon" variant="secondary" className="size-8">
                              <HandCoins className="size-4" />
                            </Button>
                          </GroupSettleUp>
                          <CurrencyConversion
                            sender={0 < amount ? friend : user}
                            receiver={0 < amount ? user : friend}
                            amount={amount}
                            currency={currency}
                            groupId={groupBalances[0]!.groupId}
                          >
                            <Button size="icon" variant="secondary" className="size-8">
                              <DollarSign className="size-4" />
                            </Button>
                          </CurrencyConversion>
                        </div>
                      </div>
                    ))}
                  </Fragment>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
