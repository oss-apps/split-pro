import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { api } from '~/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, PencilIcon, Trash, Trash2 } from 'lucide-react';
import ExpenseDetails from '~/components/Expense/ExpensePage';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import { type NextPageWithUser } from '~/types';
import { env } from '~/env';
import { Button } from '~/components/ui/button';
import {useTranslation} from "react-i18next";

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const friendId = parseInt(router.query.friendId as string);
  const {t} = useTranslation('expense_details')

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{t('ui/title')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/balances/${friendId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('ui/title')}</p>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            <DeleteExpense
              expenseId={expenseId}
              friendId={friendId}
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
