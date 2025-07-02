import { PlusIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { CreateGroup } from '~/components/group/CreateGroup';
import MainLayout from '~/components/Layout/MainLayout';
import { GroupAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';
import { withI18nStaticProps } from '~/utils/i18n/server';

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation('groups_page');
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();

  const actions = useMemo(
    () => (
      <CreateGroup>
        <PlusIcon className="text-primary h-6 w-6" />
      </CreateGroup>
    ),
    [],
  );

  return (
    <>
      <Head>
        <title>{t('ui.title')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title={t('ui.title')} actions={actions} loading={groupQuery.isPending}>
        <div className="mt-7 flex flex-col gap-8 pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-[30vh] flex flex-col items-center justify-center gap-20">
              <CreateGroup>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('ui.group_create_btn')}
                </Button>
              </CreateGroup>
            </div>
          ) : (
            groupQuery.data?.map((g) => {
              const [currency, amount] = Object.entries(g.balances).reduce(
                (acc, balance) => {
                  if (BigMath.abs(balance[1]) > BigMath.abs(acc[1])) {
                    return balance;
                  }
                  return acc;
                },
                [g.defaultCurrency, 0n],
              );
              const multiCurrency = 1 < Object.values(g.balances).filter((b) => 0n !== b).length;
              return (
                <GroupBalance
                  key={g.id}
                  groupId={g.id}
                  name={g.name}
                  amount={amount}
                  isPositive={0 <= amount}
                  currency={currency}
                  multiCurrency={multiCurrency}
                  t={t}
                />
              );
            })
          )}
        </div>
      </MainLayout>
    </>
  );
};

const GroupBalance: React.FC<{
  groupId: number;
  name: string;
  amount: bigint;
  isPositive: boolean;
  currency: string;
  multiCurrency?: boolean;
  t: (key: string) => string;
}> = ({ name, amount, isPositive, currency, groupId, multiCurrency, t }) => {
  return (
    <Link href={`/groups/${groupId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GroupAvatar name={name} size={40} />
          <div className="text-foreground">{name}</div>
        </div>
        <div>
          {0n === amount ? (
            <div className="text-sm text-gray-400">{t('ui.settled_up')}</div>
          ) : (
            <>
              <div
                className={clsx(
                  'text-right text-xs',
                  isPositive ? 'text-emerald-500' : 'text-orange-600',
                )}
              >
                {isPositive ? t('ui.you_lent') : t('ui.you_owe')}
              </div>
              <div className={`${isPositive ? 'text-emerald-500' : 'text-orange-600'} text-right`}>
                {currency} {toUIString(amount)}
                {multiCurrency ? '*' : ''}
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps([
  'groups_page',
  'groups_details',
  'expense_details',
  'common',
]);

export default BalancePage;
