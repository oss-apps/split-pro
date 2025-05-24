import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import React from 'react';
import { api } from '~/utils/api';
import { Button } from '../ui/button';
import { SimpleConfirmationDialog } from '../ui/SimpleConfirmationDialog';

export const DeleteExpense: React.FC<{
  expenseId: string;
  friendId?: number;
  groupId?: number;
}> = ({ expenseId, friendId, groupId }) => {
  const router = useRouter();

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
    <SimpleConfirmationDialog
      title="Are you absolutely sure?"
      description="This action cannot be undone. This will permanently delete your expense."
      hasPermission
      onConfirm={onDeleteExpense}
      loading={deleteExpenseMutation.isLoading}
      variant="destructive"
    >
      <Button variant="ghost">
        <Trash2 className="text-red-400" size={23} />
      </Button>
    </SimpleConfirmationDialog>
  );
};
