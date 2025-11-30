import { useMemo } from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

export const CumulatedBalances: React.FC<{
  entityId: number;
  balances?: { currency: string; amount: bigint }[];
}> = ({ entityId, balances }) => {
  const { t } = useTranslationWithUtils();

  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference(entityId));

  const youLent = useMemo(() => balances?.filter((b) => 0 < b.amount) ?? [], [balances]);
  const youOwe = useMemo(() => balances?.filter((b) => 0 > b.amount) ?? [], [balances]);
  const forceShowButton =
    youLent.length === 1 && youOwe.length === 1 && youLent[0]!.currency !== youOwe[0]!.currency;
  if (!balances) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {isCurrencyCode(selectedCurrency) ? (
        <CumulatedBalanceDisplay
          prefix={`${t('ui.total_balance')}: `}
          entityId={entityId}
          cumulatedBalances={balances}
        />
      ) : (
        <>
          <CumulatedBalanceDisplay
            prefix={`${t('actors.you')} ${t('ui.expense.you.lent')}`}
            entityId={entityId}
            cumulatedBalances={youLent}
            className="text-positive"
            forceShowButton={forceShowButton}
          />
          <CumulatedBalanceDisplay
            prefix={`${t('actors.you')} ${t('ui.expense.you.owe')}`}
            entityId={entityId}
            className="text-negative"
            cumulatedBalances={youOwe}
            forceShowButton={forceShowButton}
          />
        </>
      )}
      {0 === balances.length ? <div className="text-gray-500">{t('ui.settled_up')}</div> : null}
    </div>
  );
};
const CumulatedBalanceDisplay: React.FC<{
  prefix?: string;
  entityId: number;
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
  forceShowButton?: boolean;
}> = ({ prefix = '', entityId, className = '', cumulatedBalances, forceShowButton = false }) => {
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {prefix}
      <ConvertibleBalance
        balances={cumulatedBalances}
        entityId={entityId}
        forceShowButton={forceShowButton}
        showMultiOption
      />
    </div>
  );
};
