import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'sonner';

import { extractTemplateExpenseId } from '~/lib/cron';
import { api } from '~/utils/api';

import { Button } from '../ui/button';
import { SimpleConfirmationDialog } from '../SimpleConfirmationDialog';

interface DeleteExpenseProps {
  expenseId: string;
  recurrence?: {
    id: number;
    job: {
      command: string;
    };
  } | null;
}

export const DeleteExpense: React.FC<DeleteExpenseProps> = ({ expenseId, recurrence }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const deleteExpenseMutation = api.expense.deleteExpense.useMutation();

  const isTemplate = useMemo(
    () => (recurrence ? extractTemplateExpenseId(recurrence.job.command) === expenseId : false),
    [recurrence, expenseId],
  );
  const isPartOfRecurrence = !!recurrence;

  const onDeleteExpense = useCallback(async () => {
    try {
      await deleteExpenseMutation.mutateAsync({ expenseId });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else {
        console.error('Unexpected error:', error);
        toast.error('An unexpected error occurred while deleting the expense.');
      }
      return;
    }
    router.back();
  }, [expenseId, deleteExpenseMutation, router]);

  const description = useMemo(() => {
    if (!isPartOfRecurrence) {
      return t('expense_details.delete_expense_details.text');
    }

    if (isTemplate) {
      return t('recurrence.template_delete_warning');
    }

    return (
      <>
        {t('recurrence.derived_delete_warning')}{' '}
        <Link href="/recurring" className="text-primary underline">
          {t('recurrence.view_recurring_page')}
        </Link>
      </>
    );
  }, [isPartOfRecurrence, isTemplate, t]);

  return (
    <SimpleConfirmationDialog
      title={t('expense_details.delete_expense_details.title')}
      description={description}
      hasPermission
      onConfirm={onDeleteExpense}
      loading={deleteExpenseMutation.isPending}
      variant="destructive"
    >
      <Button variant="ghost">
        <Trash2 className="text-red-400" size={23} />
      </Button>
    </SimpleConfirmationDialog>
  );
};
