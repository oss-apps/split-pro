import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import { type NextPageWithUser } from '~/types';
import { env } from 'process';
import { Button } from '~/components/ui/button';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const groupId = parseInt(router.query.groupId as string);

  const expenseQuery = api.group.getExpenseDetails.useQuery({ expenseId, groupId });

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center justify-between gap-2">
            <Link href={`/groups/${groupId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className=" w-full text-center text-[16px] font-normal">Expense details</p>
            <div></div>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            <DeleteExpense
              expenseId={expenseId}
              groupId={expenseQuery.data?.groupId ?? undefined}
            />
            <Link href={`/add?expenseId=${expenseId}`}>
              <Button variant="ghost">
                <PencilIcon className="mr-1 h-4 w-4" />
              </Button>
            </Link>
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
