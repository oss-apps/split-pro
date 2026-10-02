import { Trash2 } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'sonner';

import { api } from '~/utils/api';

import { Button } from '../ui/button';
import { SimpleConfirmationDialog } from '../SimpleConfirmationDialog';

export const DeleteFriend: React.FC<{
  friendId: number;
  disabled: boolean;
}> = ({ friendId, disabled }) => {
  const { t } = useTranslation();
  const router = useRouter();

  const deleteFriendMutation = api.user.deleteFriend.useMutation();
  const utils = api.useUtils();

  const onDeleteFriend = async () => {
    try {
      await deleteFriendMutation.mutateAsync({ friendId });
    } catch (e) {
      console.error('Failed to delete friend', e);
      toast.error(t('errors.friend_deletion_failed'));
      return;
    }
    utils.expense.getBalances.invalidate().catch(console.error);

    await router.replace(`/balances`);
  };

  return (
    <SimpleConfirmationDialog
      title={disabled ? '' : t('friend.delete_confirmation.title')}
      description={
        disabled
          ? t('friend.delete_confirmation.outstanding_balance')
          : t('friend.delete_confirmation.description')
      }
      hasPermission={!disabled}
      onConfirm={onDeleteFriend}
      loading={deleteFriendMutation.isPending}
      variant="destructive"
    >
      <Button variant="ghost" className="px-0">
        <Trash2 className="text-red-500" size={20} />
      </Button>
    </SimpleConfirmationDialog>
  );
};
