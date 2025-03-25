import React, { useState } from 'react';
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
import { toast } from 'sonner';
import {useTranslation} from "react-i18next";

export const DeleteFriend: React.FC<{
  friendId: number;
  disabled: boolean;
}> = ({ friendId, disabled }) => {
  const router = useRouter();
  const [showTrigger, setShowTrigger] = useState(false);
  const { t } = useTranslation('friend_details')

  const deleteFriendMutation = api.user.deleteFriend.useMutation();
  const utils = api.useUtils();

  const onDeleteFriend = async () => {
    try {
      await deleteFriendMutation.mutateAsync({ friendId });
    } catch (e) {
      toast.error(t('ui/delete_details/errors/failed_to_delete'));
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
            <AlertDialogTitle>{disabled ? '' : t('ui/delete_details/are_you_sure')} </AlertDialogTitle>
            <AlertDialogDescription>
              {disabled
                ? t('ui/delete_details/cant_remove')
                : t('ui/delete_details/want_to_continue')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('ui/delete_details/cancel')}</AlertDialogCancel>
            {!disabled ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteFriend}
                disabled={deleteFriendMutation.isLoading}
                loading={deleteFriendMutation.isLoading}
              >
                {t('ui/delete_details/delete')}
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
