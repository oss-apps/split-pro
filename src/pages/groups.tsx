import { PlusIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import { useMemo } from 'react';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import { CreateGroup } from '~/components/group/CreateGroup';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { BigMath } from '~/utils/numbers';

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation(['groups_details']);
  const groupQuery = api.group.getAllGroupsWithBalances.useQuery();
  const archivedGroupQuery = api.group.getAllGroupsWithBalances.useQuery({ getArchived: true });

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
        <title>{t('common:navigation.groups')}</title>
      </Head>
      <MainLayout
        title={t('common:navigation.groups')}
        actions={actions}
        loading={groupQuery.isPending}
      >
        <div className="mt-7 flex flex-col gap-8 pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-[30vh] flex flex-col items-center justify-center gap-20">
              <CreateGroup>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('common:actions.create')}
                </Button>
              </CreateGroup>
            </div>
          ) : (
            <>
              {/* Active Groups */}
              {groupQuery.data?.map((g) => {
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
                  <BalanceEntry
                    key={g.id}
                    id={g.id}
                    entity={g}
                    amount={amount}
                    isPositive={0 <= amount}
                    currency={currency}
                    hasMore={multiCurrency}
                  />
                );
              })}

              {/* Archived Groups Accordion */}
              {archivedGroupQuery.data && archivedGroupQuery.data.length > 0 && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="archived-groups">
                    <AccordionTrigger className="text-left text-sm text-gray-400">
                      {t('ui.group_info.archived')} ({archivedGroupQuery.data.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mt-7 flex flex-col gap-8">
                        {archivedGroupQuery.data.map((g) => (
                          <BalanceEntry
                            key={g.id}
                            id={g.id}
                            entity={g}
                            amount={0n}
                            isPositive
                            currency=""
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </>
          )}
        </div>
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['groups_details', 'expense_details', 'common']);

export default BalancePage;
