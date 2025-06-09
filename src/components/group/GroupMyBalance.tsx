import React from 'react';

import { type User } from '@prisma/client';
import { type getAllBalancesForGroup } from '~/prisma/client/sql';
import { BigMath, toUIString } from '~/utils/numbers';

type GroupMyBalanceProps = {
  userId: number;
  groupBalances: getAllBalancesForGroup.Result[];
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

  const friendBalances = groupBalances.reduce(
    (acc, balance) => {
      if (balance.paidBy === userId && (balance.amount != null && BigMath.abs(balance.amount) > 0)) {
        if (!acc[balance.borrowedBy]) {
          acc[balance.borrowedBy] = {};
        }
        const friendBalance = acc[balance.borrowedBy]!;
        friendBalance[balance.currency] = (friendBalance[balance.currency] ?? 0n) + (balance.amount ?? 0n);
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

  const youLent = Object.entries(cumulatedBalances).filter(([_, amount]) => amount > 0);
  const youOwe = Object.entries(cumulatedBalances).filter(([_, amount]) => amount < 0);

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2">
        {youLent.length > 0 ? (
          <div className="flex flex-wrap gap-1 text-emerald-500">
            You lent
            {youLent.map(([currency, amount], index, arr) => {
              return (
                <React.Fragment key={currency}>
                  <div className="flex gap-1 font-semibold">
                    {currency} {toUIString(amount)}
                  </div>
                  {index < arr.length - 1 ? <span>+</span> : null}
                </React.Fragment>
              );
            })}
          </div>
        ) : null}

        {youOwe.length > 0 ? (
          <div className="text-orange-6000 flex flex-wrap gap-1 text-orange-600">
            You owe
            {youOwe.map(([currency, amount], index, arr) => {
              return (
                <React.Fragment key={currency}>
                  <div className="flex gap-1 font-semibold">
                    {currency} {toUIString(amount)}
                  </div>
                  {index < arr.length - 1 ? <span>+</span> : null}
                </React.Fragment>
              );
            })}
          </div>
        ) : null}

        {youLent.length === 0 && youOwe.length === 0 ? (
          <div className="text-gray-500">You are all settled up</div>
        ) : null}

        {Object.entries(friendBalances)
          .slice(0, 2)
          .map(([friendId, balances]) => {
            const friend = userMap[+friendId];
            return (
              <div key={friendId} className="text-sm text-gray-500">
                {Object.entries(balances).map(([currency, amount]) => (
                  <div key={currency}>
                    {amount > 0 ? `${friend?.name} owes you` : `You owe ${friend?.name}`}{' '}
                    {toUIString(amount)} {currency}
                  </div>
                ))}
              </div>
            );
          })}

        {Object.keys(friendBalances).length > 2 ? (
          <div className="text-sm text-gray-500">
            +{Object.keys(friendBalances).length - 2} balance
            {Object.keys(friendBalances).length > 3 ? 's' : ''}...
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GroupMyBalance;
