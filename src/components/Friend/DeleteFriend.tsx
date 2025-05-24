import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/router';
import React from 'react';
import { toast } from 'sonner';
import { api } from '~/utils/api';
import { Button } from '../ui/button';
import { SimpleConfirmationDialog } from '../ui/SimpleConfirmationDialog';

export const DeleteFriend: React.FC<{
  friendId: number;
  disabled: boolean;
}> = ({ friendId, disabled }) => {
  const router = useRouter();

  const deleteFriendMutation = api.user.deleteFriend.useMutation();
  const utils = api.useUtils();

  const onDeleteFriend = async () => {
    try {
      await deleteFriendMutation.mutateAsync({ friendId });
    } catch (e) {
      toast.error('Failed to delete user');
      return;
    }
    utils.user.getBalances.invalidate().catch(console.error);

    await router.replace(`/balances`);
  };

  return (
    <SimpleConfirmationDialog
      title={disabled ? '' : 'Are you absolutely sure?'}
      description={
        disabled
          ? "Can't remove friend with outstanding balances. Settle up first"
          : 'Do you really want to continue'
      }
      hasPermission={!disabled}
      onConfirm={onDeleteFriend}
      loading={deleteFriendMutation.isLoading}
      variant="destructive"
    >
      <Button variant="ghost" className="px-0">
        <Trash2 className="text-red-500" size={20} />
      </Button>
    </SimpleConfirmationDialog>
  );
};
