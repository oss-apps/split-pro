import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { api } from '~/utils/api';

import { Button } from '../ui/button';
import { Input } from '../ui/input';

export const RenameFriend: React.FC<{
  friendId: number;
  currentName: string | null;
  onRenamed?: () => void;
}> = ({ friendId, currentName, onRenamed }) => {
  const [name, setName] = useState(currentName ?? '');

  const renameFriendMutation = api.user.updateFriendName.useMutation();

  const onRename = useCallback(async () => {
    const trimmed = name.trim();
    if ('' === trimmed || trimmed === currentName) {
      return;
    }

    try {
      await renameFriendMutation.mutateAsync({ friendId, name: trimmed });
    } catch (e) {
      console.error('Failed to rename friend', e);
      toast.error('Failed to rename user');
      return;
    }

    toast.success('Name updated');
    onRenamed?.();
  }, [name, currentName, friendId, renameFriendMutation, onRenamed]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    [],
  );

  const handleSaveClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onRename().catch(console.error);
    },
    [onRename],
  );

  return (
    <div className="flex items-center gap-2">
      <Input value={name} onChange={handleNameChange} placeholder="Name" />
      <Button
        size="sm"
        onClick={handleSaveClick}
        disabled={'' === name.trim() || name.trim() === currentName || renameFriendMutation.isPending}
      >
        Save
      </Button>
    </div>
  );
};
