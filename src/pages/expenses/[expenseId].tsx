import { env } from 'process';

import { SplitType } from '@prisma/client';
import { ChevronLeftIcon, PencilIcon } from 'lucide-react';
import { type GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useMemo } from 'react';

import { DeleteExpense } from '~/components/Expense/DeleteExpense';
import ExpenseDetails, {
  EditCurrencyConversion,
  EditSettlement,
} from '~/components/Expense/ExpenseDetails';
import MainLayout from '~/components/Layout/MainLayout';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { Button } from '~/components/ui/button';
import { extractTemplateExpenseId } from '~/lib/cron';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';

const ExpensesPage: NextPageWithUser<{ storagePublicUrl?: string }> = ({
  user,
  storagePublicUrl,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const expenseId = router.query.expenseId as string;
  const keepAdding = !!router.query.keepAdding;

  const expenseQuery = api.expense.getExpenseDetails.useQuery({ expenseId });

  const recurrence = expenseQuery.data?.recurrence;
  const isTemplate = useMemo(
    () => (recurrence ? extractTemplateExpenseId(recurrence.job.command) === expenseId : false),
    [recurrence, expenseId],
  );

  const handleEditConfirm = useCallback(async () => {
    await router.push(`/add?expenseId=${expenseId}`);
  }, [router, expenseId]);

  const editDescription = useMemo(() => {
    if (!recurrence) {
      return '';
    }

    if (isTemplate) {
      return t('recurrence.template_edit_warning');
    }

    return (
      <>
        {t('recurrence.derived_edit_warning')}{' '}
        <Link href="/recurring" className="text-primary underline">
          {t('recurrence.view_recurring_page')}
        </Link>
      </>
    );
  }, [recurrence, isTemplate, t]);

  const renderEditButton = () => {
    const editButton = (
      <Button variant="ghost">
        <PencilIcon className="mr-1 h-4 w-4" />
      </Button>
    );

    // If expense has recurrence, show confirmation dialog
    if (recurrence) {
      return (
        <SimpleConfirmationDialog
          title={t('recurrence.edit_confirmation_title')}
          description={editDescription}
          hasPermission
          onConfirm={handleEditConfirm}
          loading={false}
        >
          {editButton}
        </SimpleConfirmationDialog>
      );
    }

    // No recurrence, just link directly
    return <Link href={`/add?expenseId=${expenseId}`}>{editButton}</Link>;
  };

  return (
    <>
      <Head>
        <title>{expenseQuery.data?.name ?? ''}</title>
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href={keepAdding ? '/add' : '/activity'}>
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-[16px] font-normal">{t('ui.expense_details')}</p>
          </div>
        }
        actions={
          <div className="flex items-center gap-1">
            {!expenseQuery.data?.deletedBy ? (
              <div className="flex items-center gap-1">
                <DeleteExpense expenseId={expenseId} recurrence={recurrence} />
                {expenseQuery.data?.splitType === SplitType.CURRENCY_CONVERSION ? (
                  <EditCurrencyConversion expense={expenseQuery.data} />
                ) : expenseQuery.data?.splitType === SplitType.SETTLEMENT ? (
                  <EditSettlement expense={expenseQuery.data} />
                ) : (
                  renderEditButton()
                )}
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

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    storagePublicUrl: env.R2_PUBLIC_URL,
    ...(await customServerSideTranslations(context.locale, ['common'])),
  },
});

export default ExpensesPage;
