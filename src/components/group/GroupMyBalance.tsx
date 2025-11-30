import { type BalanceView, type User } from '@prisma/client';
import React, { useMemo } from 'react';

import { BigMath } from '~/utils/numbers';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { ConvertibleBalance, getConvertibleBalanceSessionKey } from '../Expense/ConvertibleBalance';
import { cn } from '~/lib/utils';
import { useSession } from '~/hooks/useSession';
import { isCurrencyCode } from '~/lib/currency';

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

  const youLentBalances = useMemo(
    () => cumulatedBalances.filter(({ amount }) => 0 < amount),
    [cumulatedBalances],
  );

  const youOweBalances = useMemo(
    () => cumulatedBalances.filter(({ amount }) => amount < 0n),
    [cumulatedBalances],
  );

  const sessionKey = getConvertibleBalanceSessionKey(groupId);
  const [selectedCurrency] = useSession(sessionKey);

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2">
        {isCurrencyCode(selectedCurrency) ? (
          <CumulatedBalanceDisplay
            prefix={`${t('ui.total_balance')}: `}
            groupId={groupId}
            cumulatedBalances={cumulatedBalances}
          />
        ) : (
          <>
            <CumulatedBalanceDisplay
              prefix={`${t('actors.you')} ${t('ui.expense.you.lent')}`}
              groupId={groupId}
              cumulatedBalances={youLentBalances}
            />
            <CumulatedBalanceDisplay
              prefix={`${t('actors.you')} ${t('ui.expense.you.owe')}`}
              groupId={groupId}
              className="mt-1"
              cumulatedBalances={youOweBalances}
            />
          </>
        )}
        {0 === cumulatedBalances.length ? (
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

const CumulatedBalanceDisplay: React.FC<{
  prefix?: string;
  groupId: number;
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
}> = ({ prefix = '', groupId, className = '', cumulatedBalances }) => {
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {prefix}
      <ConvertibleBalance balances={cumulatedBalances} entityId={groupId} showMultiOption />
    </div>
  );
};
export default GroupMyBalance;
