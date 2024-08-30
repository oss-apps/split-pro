import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';
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

export const DeleteExpense: React.FC<{
  expenseId: string;
  friendId?: number;
  groupId?: number;
}> = ({ expenseId, friendId, groupId }) => {
  const router = useRouter();

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

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
            <AlertDialogTitle>{t('expense_delete_alert_title')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('expense_delete_alert_text')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={onDeleteExpense}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
