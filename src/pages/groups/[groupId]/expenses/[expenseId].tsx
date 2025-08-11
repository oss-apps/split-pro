import { env } from 'process';

import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const { t } = useTranslation('groups_details');
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const groupId = parseInt(router.query.groupId as string);

  const expenseQuery = api.expense.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{t('ui.outstanding_balances')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center justify-between gap-2">
            <Link href={`/groups/${groupId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="w-full text-center text-[16px] font-normal">{t('ui.expense_details')}</p>
            <div />
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
        loading={expenseQuery.isPending}
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

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    ...(env.R2_PUBLIC_URL ? { storagePublicUrl: env.R2_PUBLIC_URL } : {}),
    ...(await customServerSideTranslations(context.locale, [
      'common',
      'groups_details',
      'expense_details',
    ])),
  },
});

export default ExpensesPage;
