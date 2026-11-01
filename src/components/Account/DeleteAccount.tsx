import { Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { api } from '~/utils/api';

export const DeleteAccount = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const submitting = useRef(false);
  const mutation = api.user.deleteAccount.useMutation();

  const onDelete = async () => {
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    setDeleting(true);
    try {
      await mutation.mutateAsync();
    } catch {
      submitting.current = false;
      setDeleting(false);
      toast.error(t('account.deletion.error'));
      return;
    }

    try {
      await signOut({ redirect: false });
    } finally {
      // A full navigation also discards query caches and in-memory expense drafts.
      // The server has already revoked every session, even if signOut fails.
      window.location.replace('/auth/signin');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !deleting && setOpen(value)}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 data-icon="inline-start" />
          {t('account.deletion.action')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onEscapeKeyDown={(event) => deleting && event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('account.deletion.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('account.deletion.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t('actions.cancel')}</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={onDelete}>
            {t('account.deletion.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
