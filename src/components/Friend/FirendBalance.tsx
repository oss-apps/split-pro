import { type Balance, type User } from '@prisma/client';
import { UserAvatar } from '../ui/avatar';
import React, { useEffect } from 'react';
import clsx from 'clsx';
import { toUIString } from '~/utils/numbers';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

export const FriendBalance: React.FC<{ user: User; balance: Balance }> = ({ user, balance }) => {
  const isPositive = balance.amount > 0;

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <UserAvatar user={user} size={30} />
        <div className=" text-foreground">{user.name}</div>
      </div>
      <div>
        <div
          className={clsx('text-right text-xs', isPositive ? 'text-green-500' : 'text-orange-600')}
        >
          {isPositive ? t('you_get') : t('you_owe')}
        </div>
        <div className={`${isPositive ? 'text-green-500' : 'text-orange-600'} flex text-right`}>
          {balance.currency} {toUIString(balance.amount)}
        </div>
      </div>
    </div>
  );
};
