import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { toast } from 'sonner';

export const DeleteFriend: React.FC<{
  friendId: number;
  disabled: boolean;
}> = ({ friendId, disabled }) => {
  const router = useRouter();
  const [showTrigger, setShowTrigger] = useState(false);

  const deleteFriendMutation = api.user.deleteFriend.useMutation();
  const utils = api.useUtils();

  const onDeleteFriend = async () => {
    try {
      await deleteFriendMutation.mutateAsync({ friendId });
    } catch (e) {
      toast.error('Failed to delete user');
      return;
    }
    setShowTrigger(false);
    utils.user.getBalances.invalidate().catch(console.error);

    await router.replace(`/balances`);
  };

  return (
    <div>
      <AlertDialog
        open={showTrigger}
        onOpenChange={(status) => (status !== showTrigger ? setShowTrigger(status) : null)}
      >
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="px-0">
            <Trash2 className="text-red-500" size={20} />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-xs rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{disabled ? '' : 'Are you absolutely sure?'} </AlertDialogTitle>
            <AlertDialogDescription>
              {disabled
                ? "Can't remove friend with outstanding balances. Settle up first"
                : 'Do you really want to continue'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!disabled ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteFriend}
                disabled={deleteFriendMutation.isLoading}
                loading={deleteFriendMutation.isLoading}
              >
                Delete
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
