import { ChevronLeftIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend } from '~/lib/cron';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { toUIString } from '~/utils/numbers';

const RecurringPage: NextPageWithUser = () => {
  const { t, toUIDate } = useTranslationWithUtils();

  const recurringExpensesQuery = api.expense.getRecurringExpenses.useQuery();

  const { cronParser, i18nReady } = useIntlCronParser();

  return (
    <>
      <Head>
        <title>{t('navigation.recurring')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href="/activity">
              <Button variant="ghost" className="p-0">
                <ChevronLeftIcon className="mr-1 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-[16px] font-normal">{t('navigation.recurring')}</p>
          </div>
        }
        loading={recurringExpensesQuery.isPending}
      >
        <div className="flex flex-col gap-4">
          {!recurringExpensesQuery.data?.length ? (
            <div className="mt-[30vh] text-center text-gray-400">{t('recurrence.empty')}</div>
          ) : null}
          {recurringExpensesQuery.data?.map((e) => (
            <Link href={`/expenses/${e.expense.id}`} key={e.expense.id} className="flex gap-2">
              <div className="mt-1">
                <EntityAvatar entity={e.expense.addedByUser} size={30} />
              </div>
              <div>
                <p className="font-semibold">
                  {t('recurrence.expense_for_the_amount_of', {
                    name: e.expense.name,
                    amount: toUIString(e.expense.amount),
                    currency: e.expense.currency,
                  })}
                </p>
                <p className="text-primary text-sm">
                  {t('recurrence.recurring')}
                  {i18nReady
                    ? `: 
                
                ${cronParser(cronFromBackend(e.job.schedule))}`
                    : ''}
                </p>
                <p className="text-xs text-gray-500">{toUIDate(e.expense.expenseDate)}</p>
              </div>
            </Link>
          ))}
        </div>
      </MainLayout>
    </>
  );
};

RecurringPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default RecurringPage;
