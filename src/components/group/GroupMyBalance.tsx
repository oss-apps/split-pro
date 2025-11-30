import { type BalanceView, type User } from '@prisma/client';
import React, { useMemo } from 'react';

import { CumulatedBalances } from '~/components/Expense/CumulatedBalances';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { BigMath } from '~/utils/numbers';

interface GroupMyBalanceProps {
  userId: number;
  groupBalances?: BalanceView[];
  users?: User[];
  groupId: number;
}

const GroupMyBalance: React.FC<GroupMyBalanceProps> = ({
  userId,
  groupBalances = [],
  users = [],
  groupId,
}) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const userMap = useMemo(
    () =>
      users.reduce(
        (acc, user) => {
          acc[user.id] = user;
          return acc;
        },
        {} as Record<number, User>,
      ),
    [users],
  );

  const friendBalances = useMemo(
    () =>
      groupBalances.reduce(
        (acc, balance) => {
          if (balance.userId === userId && 0 < BigMath.abs(balance.amount)) {
            acc[balance.friendId] ??= {};
            const friendBalance = acc[balance.friendId]!;
            friendBalance[balance.currency] =
              (friendBalance[balance.currency] ?? 0n) + balance.amount;
          }
          return acc;
        },
        {} as Record<number, Record<string, bigint>>,
      ),
    [groupBalances, userId],
  );

  const cumulatedBalances = useMemo(
    () =>
      Object.entries(
        Object.values(friendBalances).reduce(
          (acc, balances) => {
            if (balances) {
              Object.entries(balances).forEach(([currency, amount]) => {
                acc[currency] = (acc[currency] ?? 0n) + amount;
              });
            }
            return acc;
          },
          {} as Record<string, bigint>,
        ),
      ).map(([currency, amount]) => ({ currency, amount })),
    [friendBalances],
  );

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2">
        <CumulatedBalances entityId={groupId} balances={cumulatedBalances} />

        {Object.entries(friendBalances)
          .slice(0, 2)
          .map(([friendId, balances]) => {
            const friend = userMap[+friendId];
            return (
              <div key={friendId} className="text-sm text-gray-500">
                {Object.entries(balances).map(([currency, amount]) => (
                  <div key={currency}>
                    {0 < amount
                      ? `${friend?.name} ${t('ui.expense.user.owe')} ${t('actors.you_dativus').toLowerCase()}`
                      : `${t('actors.you')} ${t('ui.expense.you.owe')} ${friend?.name}`}{' '}
                    {getCurrencyHelpersCached(currency).toUIString(amount)}
                  </div>
                ))}
              </div>
            );
          })}

        {2 < Object.keys(friendBalances).length ? (
          <div className="text-sm text-gray-500">
            +{Object.keys(friendBalances).length - 2}{' '}
            {Object.keys(friendBalances).length === 3 ? t('ui.balance') : t('ui.balances')}...
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GroupMyBalance;
