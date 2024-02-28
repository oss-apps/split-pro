import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, Trash, Trash2 } from 'lucide-react';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import { Button } from '~/components/ui/button';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';

const ExpensesPage: NextPage<{ user: User }> = ({ user }) => {
  const router = useRouter();
  const expenseId = router.query.expenseId as string;

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        user={user}
        title={
          <div className="flex items-center gap-2">
            <Link href={`/activity`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">Expense details</p>
          </div>
        }
        actions={<DeleteExpense expenseId={expenseId} />}
      >
        {expenseQuery.data ? <ExpenseDetails user={user} expense={expenseQuery.data} /> : null}
      </MainLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return getServerAuthSessionForSSG(context);
};

export default ExpensesPage;
