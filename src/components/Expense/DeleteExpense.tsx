import React from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import {useTranslation} from "react-i18next";

export const DeleteExpense: React.FC<{
  expenseId: string;
  friendId?: number;
  groupId?: number;
}> = ({ expenseId, friendId, groupId }) => {
  const router = useRouter();
  const { t } = useTranslation('expense_details');

  const deleteExpenseMutation = api.user.deleteExpense.useMutation();

  const onDeleteExpense = async () => {
    await deleteExpenseMutation.mutateAsync({ expenseId });
    if (groupId) {
      await router.replace(`/groups/${groupId}`);
      return;
    }
    if (friendId) {
      await router.replace(`/balances/${friendId}`);
      return;
    }

    await router.replace(`/balances`);
  };

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost">
            <Trash2 className="text-red-400" size={23} />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-xs rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ui/delete_expense_details/title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('ui/delete_expense_details/text')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('ui/delete_expense_details/cancel')}</AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={onDeleteExpense}>
              {t('ui/delete_expense_details/delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
