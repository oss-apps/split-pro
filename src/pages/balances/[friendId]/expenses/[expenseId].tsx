import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails, { EditCurrencyConversion } from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { env } from '~/env';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';
import { SplitType } from '@prisma/client';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const { t } = useTranslation('expense_details');
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const friendId = parseInt(router.query.friendId as string);

  const expenseQuery = api.expense.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{expenseQuery.data?.name ?? ''}</title>
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/balances/${friendId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('ui.expense_details', { ns: 'common' })}</p>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            <DeleteExpense
              expenseId={expenseId}
              friendId={friendId}
              groupId={expenseQuery.data?.groupId ?? undefined}
            />
            {expenseQuery.data?.splitType !== SplitType.CURRENCY_CONVERSION ? (
              <Link href={`/add?expenseId=${expenseId}`}>
                <Button variant="ghost">
                  <PencilIcon className="mr-1 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <EditCurrencyConversion expense={expenseQuery.data} />
            )}
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

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    storagePublicUrl: env.R2_PUBLIC_URL,
    ...(await customServerSideTranslations(context.locale, ['expense_details', 'common'])),
  },
});

export default ExpensesPage;
