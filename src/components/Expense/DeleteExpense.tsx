import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { toast } from 'sonner';

import { api } from '~/utils/api';

import { Button } from '../ui/button';
import { SimpleConfirmationDialog } from '../ui/simple-confirmation-dialog';

export const DeleteExpense: React.FC<{
  expenseId: string;
  friendId?: number;
  groupId?: number;
}> = ({ expenseId, friendId, groupId }) => {
  const { t } = useTranslation('expense_details');
  const router = useRouter();

  const deleteExpenseMutation = api.expense.deleteExpense.useMutation();

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
    if (groupId) {
      await router.replace(`/groups/${groupId}`);
      return;
    }
    if (friendId) {
      await router.replace(`/balances/${friendId}`);
      return;
    }

    await router.replace(`/balances`);
  }, [groupId, friendId, expenseId, deleteExpenseMutation, router]);

  return (
    <SimpleConfirmationDialog
      title={t('ui.delete_expense_details.title')}
      description={t('ui.delete_expense_details.text')}
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
