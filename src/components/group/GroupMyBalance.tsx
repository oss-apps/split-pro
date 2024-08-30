import { type GroupBalance, type User } from '@prisma/client';
import React, { useEffect } from 'react';
import { toUIString } from '~/utils/numbers';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

type GroupMyBalanceProps = {
  userId: number;
  groupBalances: GroupBalance[];
  users: User[];
};

const GroupMyBalance: React.FC<GroupMyBalanceProps> = ({ userId, groupBalances, users }) => {
  const userMap = users.reduce(
    (acc, user) => {
      acc[user.id] = user;
      return acc;
    },
    {} as Record<number, User>,
  );

  const cumulatedBalances = groupBalances.reduce(
    (acc, balance) => {
      if (balance.userId === userId && Math.abs(balance.amount) > 0) {
        acc[balance.currency] = (acc[balance.currency] ?? 0) + balance.amount;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);


  const youLent = Object.entries(cumulatedBalances).filter(([_, amount]) => amount > 0);
  const youOwe = Object.entries(cumulatedBalances).filter(([_, amount]) => amount < 0);

  return (
    <div className="flex flex-col gap-2">
      {youLent.length > 0 ? (
        <div className="flex flex-wrap gap-1 text-emerald-500">
          {t('you_lent')}
          {youLent.map(([currency, amount], index, arr) => {
            return (
              <>
                <div key={currency} className="flex gap-1 font-semibold">
                  {currency} {toUIString(amount)}
                </div>
                {index < arr.length - 1 ? <span>+</span> : null}
              </>
            );
          })}
        </div>
      ) : null}

      {youOwe.length > 0 ? (
        <div className="text-orange-6000 flex flex-wrap gap-1 text-orange-600">
          {t('you_owe')}
          {youOwe.map(([currency, amount], index, arr) => {
            return (
              <>
                <div key={currency} className="flex gap-1 font-semibold">
                  {currency} {toUIString(amount)}
                </div>
                {index < arr.length - 1 ? <span>+</span> : null}
              </>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default GroupMyBalance;
