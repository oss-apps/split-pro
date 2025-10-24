import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { EntityAvatar } from '../ui/avatar';
import { clsx } from 'clsx';
import { toUIString } from '~/utils/numbers';

export const BalanceEntry: React.FC<{
  entity: { name?: string | null; image?: string | null; email?: string | null };
  amount: bigint;
  isPositive: boolean;
  currency: string;
  id: number;
  hasMore?: boolean;
}> = ({ entity, amount, isPositive, currency, id, hasMore }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const currentRoute = router.pathname;

  return (
    <Link className="flex items-center justify-between" href={`${currentRoute}/${id}`}>
      <div className="flex items-center gap-3">
        <EntityAvatar entity={entity} size={35} />
        <div className="text-foreground">{entity.name ?? entity.email}</div>
      </div>
      {0n === amount ? (
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
            {t(`ui.expense.statements.${isPositive ? 'you_lent' : 'you_owe'}`)}
          </div>
          <div className={`${isPositive ? 'text-emerald-500' : 'text-orange-600'} text-right`}>
            {currency} {toUIString(amount)}
            <span className="mt-0.5 text-xs">{hasMore ? '*' : ''}</span>
          </div>
        </div>
      )}
    </Link>
  );
};
