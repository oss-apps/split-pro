import { Trans } from 'next-i18next';
import { useMemo } from 'react';
import { ConvertibleBalance } from '~/components/Expense/ConvertibleBalance';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import { cn } from '~/lib/utils';
import { useCurrencyPreferenceStore } from '~/store/currencyPreferenceStore';

export const CumulatedBalances: React.FC<{
  entityId: number;
  entityType?: 'group';
  balances?: { currency: string; amount: bigint }[];
}> = ({ entityId, entityType, balances }) => {
  const { t } = useTranslationWithUtils();
  const selectedCurrency = useCurrencyPreferenceStore((s) => s.getPreference(entityId, entityType));

  const allNonZeroCurrencies = useMemo(() => {
    const nonZeroBalances = balances?.filter((b) => b.amount !== 0n);
    return nonZeroBalances ? [...new Set(nonZeroBalances.map((b) => b.currency))] : [];
  }, [balances]);

  const youLent = useMemo(() => balances?.filter((b) => 0 < b.amount) ?? [], [balances]);
  const youOwe = useMemo(() => balances?.filter((b) => 0 > b.amount) ?? [], [balances]);

  if (!balances) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {isCurrencyCode(selectedCurrency) ? (
        <CumulatedBalanceDisplay
          messageKey="balance_summary.total_rich"
          entityId={entityId}
          entityType={entityType}
          cumulatedBalances={balances}
          currencies={allNonZeroCurrencies}
        />
      ) : (
        <>
          <CumulatedBalanceDisplay
            messageKey="balance_summary.lent_rich"
            entityId={entityId}
            entityType={entityType}
            cumulatedBalances={youLent}
            className="text-positive"
            forceShowButton={allNonZeroCurrencies.length > 1}
            currencies={allNonZeroCurrencies}
          />
          <CumulatedBalanceDisplay
            messageKey="balance_summary.owes_rich"
            entityId={entityId}
            entityType={entityType}
            className="text-negative"
            cumulatedBalances={youOwe}
            forceShowButton={allNonZeroCurrencies.length > 1}
            currencies={allNonZeroCurrencies}
          />
        </>
      )}
      {0 === balances.length ? <div className="text-gray-500">{t('ui.settled_up')}</div> : null}
    </div>
  );
};
const CumulatedBalanceDisplay: React.FC<{
  messageKey: string;
  entityId: number;
  entityType?: 'group';
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
  forceShowButton?: boolean;
  currencies: string[];
}> = ({
  messageKey,
  entityId,
  entityType,
  className = '',
  cumulatedBalances,
  forceShowButton = false,
  currencies,
}) => {
  const { t } = useTranslationWithUtils();
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      <Trans
        t={t}
        i18nKey={messageKey}
        components={{
          label: <span />,
          amount: (
            <ConvertibleBalance
              balances={cumulatedBalances}
              entityId={entityId}
              entityType={entityType}
              forceShowButton={forceShowButton}
              showMultiOption
              overrideCurrencies={currencies}
            />
          ),
        }}
      />
    </div>
  );
};
