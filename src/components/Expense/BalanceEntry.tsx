import { clsx } from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { EntityAvatar } from '../ui/avatar';
import { ConvertibleBalance } from './ConvertibleBalance';

export const BalanceEntry: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  balances: { currency: string; amount: bigint }[];
  id: number;
}> = ({ entity, balances, id }) => {
  const { t } = useTranslationWithUtils();
  const router = useRouter();

  const currentRoute = router.pathname;

  // Calculate if overall balance is positive or zero
  const totalAmount = balances.reduce((sum, b) => sum + b.amount, 0n);
  const isPositive = 0n < totalAmount;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <Link className="flex items-center justify-between" href={`${currentRoute}/${id}`}>
      <div className="flex items-center gap-3">
        <EntityAvatar entity={entity} size={35} />
        <div className="text-foreground">{entity.name ?? entity.email}</div>
      </div>
      {0n === totalAmount ? (
        <div>
          <p className="text-xs">{t('ui.settled_up')}</p>
        </div>
      ) : (
        <div>
          <div
            className={clsx(
              'text-right text-xs',
              isPositive ? 'text-emerald-500' : 'text-orange-600',
            )}
          >
            {t('actors.you')} {t(`ui.expense.you.${isPositive ? 'lent' : 'owe'}`)}
          </div>
          <div className="text-right" onClick={handleClick}>
            <ConvertibleBalance
              balances={balances}
              storageKey="balance-entry-currency"
              entityId={id}
              showMultiOption={false}
            />
          </div>
        </div>
      )}
    </Link>
  );
};
