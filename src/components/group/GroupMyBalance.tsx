import { type GroupBalance, type User } from '@prisma/client';
import React from 'react';
import { toUIString } from '~/utils/numbers';

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

  const youLent = Object.entries(cumulatedBalances).filter(([_, amount]) => amount > 0);
  const youOwe = Object.entries(cumulatedBalances).filter(([_, amount]) => amount < 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1 text-emerald-500">
        You lent
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

      <div className="flex flex-wrap gap-1 text-orange-600">
        You owe
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
    </div>
  );
};

export default GroupMyBalance;
