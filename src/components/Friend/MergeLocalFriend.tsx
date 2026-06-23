import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

import { api } from '~/utils/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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

export const MergeLocalFriend: React.FC<{
  friendId: number;
  friendName: string | null;
}> = ({ friendId, friendName }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const mergeMutation = api.user.mergeLocalFriend.useMutation();

  const handleMerge = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    try {
      await mergeMutation.mutateAsync({ localFriendId: friendId, registeredUserEmail: trimmed });
      toast.success(t('balances.merge.success'));
      void router.push('/balances');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('balances.merge.error');
      toast.error(message);
    }
  }, [email, friendId, mergeMutation, router, t]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('balances.merge.email_placeholder')}
        type="email"
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={!isValidEmail || mergeMutation.isPending}>
            {t('balances.merge.button')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('balances.merge.confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('balances.merge.confirm_description', {
                name: friendName ?? '?',
                email: email.trim().toLowerCase(),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void handleMerge(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('balances.merge.confirm_button')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
