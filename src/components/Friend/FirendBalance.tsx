import { type Balance, type User } from '@prisma/client';
import clsx from 'clsx';

import { toUIString } from '~/utils/numbers';

import { useTranslation } from 'next-i18next';
import { EntityAvatar } from '../ui/avatar';

export const FriendBalance: React.FC<{ user: User; balance: Balance }> = ({ user, balance }) => {
  const { t } = useTranslation();
  const isPositive = 0 < balance.amount;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <EntityAvatar entity={user} size={30} />
        <div className="text-foreground">{user.name}</div>
      </div>
      <div>
        <div
          className={clsx('text-right text-xs', isPositive ? 'text-green-500' : 'text-orange-600')}
        >
          {t('ui.actors.you')} {isPositive ? t('ui.expense.you.get') : t('ui.expense.you.owe')}
        </div>
        <div className={`${isPositive ? 'text-green-500' : 'text-orange-600'} flex text-right`}>
          {balance.currency} {toUIString(balance.amount)}
        </div>
      </div>
    </div>
  );
};
