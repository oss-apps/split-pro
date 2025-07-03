import { env } from 'process';

import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { type GetServerSideProps } from 'next';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const { t } = useTranslation('expense_details');
  const router = useRouter();
  const expenseId = router.query.expenseId as string;

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{t('ui.expense_page.title')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/activity`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('ui.expense_page.expense_details')}</p>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            {!expenseQuery.data?.deletedBy ? (
              <div className="flex items-center gap-1">
                <DeleteExpense expenseId={expenseId} />
                <Link href={`/add?expenseId=${expenseId}`}>
                  <Button variant="ghost">
                    <PencilIcon className="mr-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        }
      >
        {expenseQuery.data ? (
          <ExpenseDetails
            user={user}
            expense={expenseQuery.data}
            storagePublicUrl={storagePublicUrl}
          />
        ) : null}
      </MainLayout>
    </>
  );
};

ExpensesPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      storagePublicUrl: env.R2_PUBLIC_URL,
      ...(await customServerSideTranslations(context.locale ?? 'en', [
        'common',
        'expense_details',
      ])),
    },
  };
};

export default ExpensesPage;
