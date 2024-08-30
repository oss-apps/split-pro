import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import React, { useEffect } from 'react';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeftIcon } from 'lucide-react';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import { type NextPageWithUser } from '~/types';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

const ExpensesPage: NextPageWithUser = ({ user }) => {
  const router = useRouter();
  const expenseId = router.query.expenseId as string;

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });
  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);
  return (
    <>
      <Head>
        <title>{t('outstanding_balances')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/activity`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('expense_details')}</p>
          </div>
        }
        actions={!expenseQuery.data?.deletedBy ? <DeleteExpense expenseId={expenseId} /> : null}
      >
        {expenseQuery.data ? <ExpenseDetails user={user} expense={expenseQuery.data} /> : null}
      </MainLayout>
    </>
  );
};

ExpensesPage.auth = true;

export default ExpensesPage;
