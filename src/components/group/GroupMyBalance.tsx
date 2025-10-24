import { type GroupBalance, type User } from '@prisma/client';
import React from 'react';
import { useTranslation } from 'next-i18next';

import { BigMath, toUIString } from '~/utils/numbers';

interface GroupMyBalanceProps {
  userId: number;
  groupBalances?: GroupBalance[];
  users?: User[];
}

const GroupMyBalance: React.FC<GroupMyBalanceProps> = ({
  userId,
  groupBalances = [],
  users = [],
}) => {
  const { t } = useTranslation();
  const userMap = users.reduce(
    (acc, user) => {
      acc[user.id] = user;
      return acc;
    },
    {} as Record<number, User>,
  );

  const friendBalances = groupBalances.reduce(
    (acc, balance) => {
      if (balance.userId === userId && 0 < BigMath.abs(balance.amount)) {
        acc[balance.firendId] ??= {};
        const friendBalance = acc[balance.firendId]!;
        friendBalance[balance.currency] = (friendBalance[balance.currency] ?? 0n) + balance.amount;
      }
      return acc;
    },
    {} as Record<number, Record<string, bigint>>,
  );

  const cumulatedBalances = Object.values(friendBalances).reduce(
    (acc, balances) => {
      Object.entries(balances).forEach(([currency, amount]) => {
        acc[currency] = (acc[currency] ?? 0n) + amount;
      });
      return acc;
    },
    {} as Record<string, bigint>,
  );

  const youLent = Object.entries(cumulatedBalances).filter(([_, amount]) => 0 < amount);
  const youOwe = Object.entries(cumulatedBalances).filter(([_, amount]) => 0 > amount);
  const youDative = t('actors.you_dativus').toLowerCase();

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2">
        {0 < youLent.length ? (
          <div className="flex flex-wrap gap-1 text-emerald-500">
            {t('ui.expense.statements.you_lent')}
            {youLent.map(([currency, amount], index, arr) => (
              <React.Fragment key={currency}>
                <div className="flex gap-1 font-semibold">
                  {currency} {toUIString(amount)}
                </div>
                {index < arr.length - 1 ? <span>+</span> : null}
              </React.Fragment>
            ))}
          </div>
        ) : null}

        {0 < youOwe.length ? (
          <div className="text-orange-6000 flex flex-wrap gap-1 text-orange-600">
            {t('ui.expense.statements.you_owe')}
            {youOwe.map(([currency, amount], index, arr) => (
              <React.Fragment key={currency}>
                <div className="flex gap-1 font-semibold">
                  {currency} {toUIString(amount)}
                </div>
                {index < arr.length - 1 ? <span>+</span> : null}
              </React.Fragment>
            ))}
          </div>
        ) : null}

        {0 === youLent.length && 0 === youOwe.length ? (
          <div className="text-gray-500">{t('ui.settled_up')}</div>
        ) : null}

        {Object.entries(friendBalances)
          .slice(0, 2)
          .map(([friendId, balances]) => {
            const friend = userMap[+friendId];
            return (
              <div key={friendId} className="text-sm text-gray-500">
                {Object.entries(balances).map(([currency, amount]) => (
                  <div key={currency}>
                    {0 < amount
                      ? t('ui.expense.statements.friend_owes_you', {
                          friend: friend?.name ?? '',
                          youDative,
                        })
                      : t('ui.expense.statements.you_owe_friend', {
                          friend: friend?.name ?? '',
                        })}{' '}
                    {toUIString(amount)} {currency}
                  </div>
                ))}
              </div>
            );
          })}

        {Object.keys(friendBalances).length > 2 ? (
          <div className="text-sm text-gray-500">
            {t('ui.remaining_balances', {
              count: Object.keys(friendBalances).length - 2,
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GroupMyBalance;
