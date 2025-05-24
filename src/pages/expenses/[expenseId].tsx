import { env } from 'process';

import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
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
        title={
          <div className="flex items-center gap-2">
            <Link href={`/activity`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">Expense details</p>
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

export async function getServerSideProps() {
  return {
    props: {
      storagePublicUrl: env.R2_PUBLIC_URL,
    },
  };
}

export default ExpensesPage;
