import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { api } from '~/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, Trash, Trash2 } from 'lucide-react';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import { type NextPageWithUser } from '~/types';

const ExpensesPage: NextPageWithUser = ({ user }) => {
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const friendId = parseInt(router.query.friendId as string);

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/balances/${friendId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">Expense details</p>
          </div>
        }
        actions={
          <DeleteExpense
            expenseId={expenseId}
            friendId={friendId}
            groupId={expenseQuery.data?.groupId ?? undefined}
          />
        }
      >
        {expenseQuery.data ? <ExpenseDetails user={user} expense={expenseQuery.data} /> : null}
      </MainLayout>
    </>
  );
};

ExpensesPage.auth = true;

export default ExpensesPage;
