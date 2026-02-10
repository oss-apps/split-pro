import { ChevronLeftIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { EditRecurrenceDialog } from '~/components/Expense/EditRecurrenceDialog';
import MainLayout from '~/components/Layout/MainLayout';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend } from '~/lib/cron';
import { type NextPageWithUser } from '~/types';
import { type RouterOutputs, api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

type RecurringExpense = RouterOutputs['expense']['getRecurringExpenses'][number];

interface RecurringExpenseItemProps {
  item: RecurringExpense;
  onDelete: (recurrenceId: number) => Promise<void>;
  isDeleting: boolean;
  toUIString: (amount: bigint) => string;
  toUIDate: (date: Date) => string;
  cronParser: (cron: string) => string;
  i18nReady: boolean;
}

const RecurringExpenseItem: React.FC<RecurringExpenseItemProps> = ({
  item,
  onDelete,
  isDeleting,
  toUIString,
  toUIDate,
  cronParser,
  i18nReady,
}) => {
  const { t } = useTranslationWithUtils();

  const schedule = useMemo(() => {
    try {
      return cronFromBackend(item.job.schedule);
    } catch {
      toast.error(t('errors.invalid_cron_expression'));
      console.error(`Failed to parse cron expression for expense: ${item.job.schedule}`);
      return null;
    }
  }, [t, item.job.schedule]);

  const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);

  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={`/expenses/${item.expense.id}`} className="flex flex-1 gap-2">
        <div className="mt-1">
          <EntityAvatar entity={item.expense.addedByUser} size={30} />
        </div>
        <div>
          <p className="font-semibold">
            {t('recurrence.expense_for_the_amount_of', {
              name: item.expense.name,
              amount: toUIString(item.expense.amount),
              currency: item.expense.currency,
            })}
          </p>
          <p className="text-primary text-sm">
            {t('recurrence.recurring')}
            {i18nReady && schedule ? `: ${cronParser(schedule)}` : ''}
          </p>
          <p className="text-xs text-gray-500">{toUIDate(item.expense.expenseDate)}</p>
        </div>
      </Link>
      <div className="flex items-center gap-1">
        <EditRecurrenceDialog recurrenceId={item.id} currentSchedule={schedule}>
          <Button variant="ghost" size="sm">
            <PencilIcon className="h-4 w-4" />
          </Button>
        </EditRecurrenceDialog>

        <SimpleConfirmationDialog
          title={t('recurrence.delete_title')}
          description={t('recurrence.delete_description')}
          hasPermission
          loading={isDeleting}
          variant="destructive"
          onConfirm={handleDelete}
        >
          <Button variant="ghost" size="sm">
            <Trash2Icon className="text-destructive h-4 w-4" />
          </Button>
        </SimpleConfirmationDialog>
      </div>
    </div>
  );
};

const RecurringPage: NextPageWithUser = () => {
  const { t, toUIDate, getCurrencyHelpersCached } = useTranslationWithUtils();

  const recurringExpensesQuery = api.expense.getRecurringExpenses.useQuery();
  const deleteRecurrenceMutation = api.expense.deleteRecurrence.useMutation();
  const apiUtils = api.useUtils();

  const { cronParser, i18nReady } = useIntlCronParser();

  const { toUIString } = getCurrencyHelpersCached(
    recurringExpensesQuery.data?.[0]?.expense.currency ?? 'USD',
  );

  const handleDelete = useCallback(
    async (recurrenceId: number) => {
      try {
        await deleteRecurrenceMutation.mutateAsync({ recurrenceId });
        await apiUtils.expense.getRecurringExpenses.invalidate();
      } catch (error) {
        toast.error(t('errors.recurrence_delete_failed'));
        console.error('Error deleting recurrence:', error);
      }
    },
    [deleteRecurrenceMutation, apiUtils.expense.getRecurringExpenses, t],
  );

  return (
    <>
      <Head>
        <title>{t('navigation.recurring')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href="/activity">
              <Button variant="ghost" className="p-0">
                <ChevronLeftIcon className="mr-1 h-6 w-6" />
              </Button>
            </Link>
            <p className="text-[16px] font-normal">{t('navigation.recurring')}</p>
          </div>
        }
        loading={recurringExpensesQuery.isPending}
      >
        <div className="flex flex-col gap-4">
          {!recurringExpensesQuery.data?.length ? (
            <div className="mt-[30vh] text-center text-gray-400">{t('recurrence.empty')}</div>
          ) : null}
          {recurringExpensesQuery.data?.map((e) => (
            <RecurringExpenseItem
              key={e.expense.id}
              item={e}
              onDelete={handleDelete}
              isDeleting={deleteRecurrenceMutation.isPending}
              toUIString={toUIString}
              toUIDate={toUIDate}
              cronParser={cronParser}
              i18nReady={i18nReady}
            />
          ))}
        </div>
      </MainLayout>
    </>
  );
};

RecurringPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default RecurringPage;
