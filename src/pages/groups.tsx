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

// Helper to transform balances object to array format
function transformBalances(balances: Record<string, bigint>) {
  return Object.entries(balances)
    .filter(([_, amount]) => 0n !== amount)
    .map(([currency, amount]) => ({ currency, amount }));
}

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation();
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
        <title>{t('navigation.groups')}</title>
      </Head>
      <MainLayout title={t('navigation.groups')} actions={actions} loading={groupQuery.isPending}>
        <div className="mt-7 flex flex-col gap-8 pb-36">
          {0 === groupQuery.data?.length ? (
            <div className="mt-[30vh] mb-16 flex flex-col items-center justify-center gap-20">
              <CreateGroup>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t('actions.create')}
                </Button>
              </CreateGroup>
            </div>
          ) : (
            <>
              {/* Active Groups */}
              {groupQuery.data?.map((g) => (
                <BalanceEntry
                  key={g.id}
                  id={g.id}
                  entity={g}
                  balances={transformBalances(g.balances)}
                />
              ))}
            </>
          )}
          {/* Archived Groups Accordion */}
          {archivedGroupQuery.data && archivedGroupQuery.data.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="archived-groups">
                <AccordionTrigger className="text-left text-sm text-gray-400">
                  {t('group_details.group_info.archived')} ({archivedGroupQuery.data.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mt-7 flex flex-col gap-8">
                    {archivedGroupQuery.data.map((g) => (
                      <BalanceEntry key={g.id} id={g.id} entity={g} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default BalancePage;
