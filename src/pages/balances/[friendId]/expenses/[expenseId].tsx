import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from 'next-i18next.config.js';
import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { env } from '~/env';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const { t } = useTranslation('friend_details');
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const friendId = parseInt(router.query.friendId as string);

  const expenseQuery = api.user.getExpenseDetails.useQuery({ expenseId });

  return (
    <>
      <Head>
        <title>{t('ui.expense_page.title')}</title>
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={`/balances/${friendId}`}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('ui.expense_page.expense_details')}</p>
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

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      storagePublicUrl: env.R2_PUBLIC_URL,
      ...(await serverSideTranslations(
        locale,
        ['friend_details', 'expense_details', 'common'],
        i18nConfig,
      )),
    },
  };
}

export default ExpensesPage;
