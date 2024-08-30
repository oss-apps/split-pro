import React, { useState, useEffect } from 'react';
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
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

export const DeleteFriend: React.FC<{
  friendId: number;
  disabled: boolean;
}> = ({ friendId, disabled }) => {
  const router = useRouter();
  const [showTrigger, setShowTrigger] = useState(false);

  const deleteFriendMutation = api.user.deleteFriend.useMutation();
  const utils = api.useUtils();

  const { t, ready } = useTranslation();

  // Ensure i18n is ready
  useEffect(() => {
    if (!ready) return; // Don't render the component until i18n is ready
  }, [ready]);

  const onDeleteFriend = async () => {
    try {
      await deleteFriendMutation.mutateAsync({ friendId });
    } catch (e) {
      toast.error(t('delete_user_error'));
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
            <AlertDialogTitle>{disabled ? '' : t('delete_user_alert_title')} </AlertDialogTitle>
            <AlertDialogDescription>
              {disabled
                ? t('delete_user_alert_text_error')
                : t('delete_user_alert_text')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            {!disabled ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeleteFriend}
                disabled={deleteFriendMutation.isLoading}
                loading={deleteFriendMutation.isLoading}
              >
                {t('delete')}
              </Button>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
