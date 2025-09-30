import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

const RecurringPage: NextPageWithUser = ({ user }) => {
  const { displayName, t, toUIDate } = useTranslationWithUtils();

  const recurringExpensesQuery = api.expense.getRecurringExpenses.useQuery();

  return (
    <>
      <Head>
        <title>{t('navigation.recurring')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title={t('navigation.recurring')} loading={recurringExpensesQuery.isPending}>
        <div className="flex flex-col gap-4">
          {!recurringExpensesQuery.data?.length ? (
            <div className="mt-[30vh] text-center text-gray-400">{t('ui.recurring.empty')}</div>
          ) : null}
          {recurringExpensesQuery.data?.map((e) => (
            <Link href={`/expenses/${e.expenseId}`} key={e.expenseId} className="flex gap-2">
              <div className="mt-1">
                <EntityAvatar entity={e.expense.addedByUser} size={30} />
              </div>
              <div>
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
