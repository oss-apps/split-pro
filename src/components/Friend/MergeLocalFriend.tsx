import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

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
  const [email, setEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const mergeMutation = api.user.mergeLocalFriend.useMutation();

  const handleMerge = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    try {
      await mergeMutation.mutateAsync({ localFriendId: friendId, registeredUserEmail: trimmed });
      toast.success('Accounts successfully merged');
      void router.push('/balances');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Merge failed';
      toast.error(message);
    }
  }, [email, friendId, mergeMutation, router]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email of registered user"
        type="email"
      />
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={!isValidEmail || mergeMutation.isPending}>
            Merge accounts
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge <strong>{friendName ?? 'the local contact'}</strong> with the
              registered account <strong>{email.trim().toLowerCase()}</strong>. All expenses and
              group memberships will be transferred. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void handleMerge(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, merge accounts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
