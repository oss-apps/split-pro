import { type Balance, type User } from '@prisma/client';
import { clsx } from 'clsx';

import { EntityAvatar } from '../ui/avatar';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

export const FriendBalance: React.FC<{ user: User; balance: Balance }> = ({ user, balance }) => {
  const { t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(balance.currency);
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
          {t('ui.actors.you')} {isPositive ? t('ui.expense.you.lent') : t('ui.expense.you.owe')}
        </div>
        <div className={`${isPositive ? 'text-green-500' : 'text-orange-600'} flex text-right`}>
          {toUIString(balance.amount)}
        </div>
      </div>
    </div>
  );
};
