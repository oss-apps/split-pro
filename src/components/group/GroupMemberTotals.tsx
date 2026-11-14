import React, { Fragment, useState } from 'react';

import { EntityAvatar } from '~/components/ui/avatar';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import { sumInCurrency, toFraction } from '~/lib/groupStatistics';
import { api } from '~/utils/api';

interface GroupMemberTotalsProps {
  groupId: number;
  defaultCurrency?: string | null;
}

interface Amount {
  currency: string;
  amount: bigint;
}

const GroupMemberTotals: React.FC<GroupMemberTotalsProps> = ({ groupId, defaultCurrency }) => {
  const { t, displayName, getCurrencyHelpersCached } = useTranslationWithUtils();
  const [ratesDate] = useState(() => new Date());
  const memberTotalsQuery = api.group.getGroupMemberTotals.useQuery(
    { groupId },
    { enabled: Boolean(groupId) },
  );

  const currencies = memberTotalsQuery.data?.currencies ?? [];
  const members = [...(memberTotalsQuery.data?.members ?? [])].sort((a, b) =>
    displayName(a.user).localeCompare(displayName(b.user)),
  );
  const isMultiCurrency = 1 < currencies.length;
  const groupDefaultCurrency = isCurrencyCode(defaultCurrency) ? defaultCurrency : null;
  // Percentages need one currency: the only one used, or the group default to convert into.
  const percentCurrency = isMultiCurrency ? groupDefaultCurrency : currencies[0];
  const targetCurrency = isCurrencyCode(percentCurrency) ? percentCurrency : null;
  // Shown when every amount on a line is zero; currencies are ordered most-used first.
  const zeroCurrency = (isMultiCurrency ? groupDefaultCurrency : null) ?? currencies[0];

  const ratesQuery = api.expense.getBatchCurrencyRates.useQuery(
    {
      from: currencies.filter((currency) => currency !== targetCurrency),
      to: targetCurrency ?? '',
      date: ratesDate,
    },
    { enabled: isMultiCurrency && null !== targetCurrency },
  );

  if (0 === members.length || undefined === zeroCurrency) {
    return null;
  }

  const rates = isMultiCurrency ? ratesQuery.data?.rates : new Map<string, number>();
  const toTarget = (amounts: Amount[]) =>
    null !== targetCurrency && rates ? sumInCurrency(amounts, targetCurrency, rates) : null;

  const paidAmounts = (totals: (typeof members)[number]['totals']) =>
    totals.map(({ currency, paid }) => ({ currency, amount: paid }));
  const shareAmounts = (totals: (typeof members)[number]['totals']) =>
    totals.map(({ currency, share }) => ({ currency, amount: share }));

  const groupTotal = toTarget(members.flatMap(({ totals }) => paidAmounts(totals)));

  const renderAmounts = (allAmounts: Amount[]) => {
    const nonZero = allAmounts.filter(({ amount }) => 0n !== amount);
    const amounts = 0 < nonZero.length ? nonZero : [{ currency: zeroCurrency, amount: 0n }];
    const part = toTarget(nonZero);
    const fraction = null === part || null === groupTotal ? null : toFraction(part, groupTotal);

    return (
      <>
        {amounts.map(({ currency, amount }, index, arr) => (
          <Fragment key={currency}>
            <span>{getCurrencyHelpersCached(currency).toUIString(amount)}</span>
            {index < arr.length - 1 ? <span>+</span> : null}
          </Fragment>
        ))}
        {null !== fraction ? (
          <span>
            (
            {t(
              isMultiCurrency
                ? 'group_details.group_statistics.approximate_percentage'
                : 'group_details.group_statistics.percentage',
              { value: fraction },
            )}
            )
          </span>
        ) : null}
      </>
    );
  };

  return (
    <div className="mt-8">
      <p className="font-semibold">{t('group_details.group_statistics.per_person')}</p>
      <div className="mt-2 flex flex-col gap-3">
        {members.map(({ user, totals }) => (
          <div key={user.id} className="flex items-center gap-3">
            <EntityAvatar entity={user} />
            <div className="min-w-0">
              <p className="truncate">{displayName(user)}</p>
              <div className="text-muted-foreground flex flex-wrap gap-1 text-sm">
                <span>{t('group_details.group_statistics.paid')}</span>
                {renderAmounts(paidAmounts(totals))}
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-1 text-sm">
                <span>{t('group_details.group_statistics.share')}</span>
                {renderAmounts(shareAmounts(totals))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupMemberTotals;
