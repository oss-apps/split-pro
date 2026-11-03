import { type Group, type GroupUser } from '@prisma/client';
import { clsx } from 'clsx';
import { CheckIcon } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import {
  getInviteAppErrorCode,
  getInviteErrorToastKey,
  isInviteEmailSendFailed,
} from '~/lib/error/invite';
import { peopleListEmptyReason } from '~/lib/peopleList';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';
import { Input } from '../ui/input';
import { InvitationOption } from '../InvitationOption';

const AddMembers: React.FC<{
  enableSendingInvites: boolean;
  group: (Group & { groupUsers: GroupUser[] }) | null | undefined;
  children: React.ReactNode;
}> = ({ group, children, enableSendingInvites }) => {
  const { t, displayName } = useTranslationWithUtils();
  const [open, setOpen] = useState(false);
  const [userIds, setUserIds] = useState<Record<number, boolean>>({});
  const [inputValue, setInputValue] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const friendsQuery = api.user.getFriends.useQuery();
  const addMembersMutation = api.group.addMembers.useMutation();
  const addFriendMutation = api.user.inviteFriend.useMutation();

  const utils = api.useUtils();

  if (!group) {
    return null;
  }

  const groupUserMap = group.groupUsers.reduce<Record<string, boolean>>((acc, gu) => {
    acc[gu.userId] = true;
    return acc;
  }, {});

  const filteredUsers = friendsQuery.data?.filter(
    (friend) =>
      !groupUserMap[friend.id] &&
      displayName(friend).toLowerCase().includes(inputValue.toLowerCase()),
  );

  /* Says why the list is blank instead of rendering nothing, which reads as a broken dialog. */
  const emptyReason = filteredUsers?.length
    ? null
    : peopleListEmptyReason({
        isLoading: friendsQuery.isPending,
        hasAnyContacts: 0 < (friendsQuery.data?.length ?? 0),
        isFiltering: '' !== inputValue.trim(),
      });

  function onUserSelect(userId: number) {
    setUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  const isEmail = z.string().email().safeParse(inputValue.trim());
  const selectedIds = Object.entries(userIds)
    .filter(([, selected]) => selected)
    .map(([id]) => Number(id));

  const handleClose = () => {
    if (submitting.current) {
      return;
    }
    setOpen(false);
    setInputValue('');
    setUserIds({});
    setSendInvite(false);
  };

  const onSave = async () => {
    if (submitting.current || (!isEmail.success && 0 === selectedIds.length)) {
      return;
    }
    submitting.current = true;
    setSaving(true);
    let inviteFailed = false;
    try {
      const users = [...selectedIds];
      if (isEmail.success) {
        const email = isEmail.data.toLowerCase();
        let user = null;
        try {
          user = await addFriendMutation.mutateAsync({
            email,
            sendInviteEmail: enableSendingInvites && sendInvite,
          });
        } catch (error) {
          const code = getInviteAppErrorCode(error);
          if (!isInviteEmailSendFailed(code)) {
            toast.error(t(getInviteErrorToastKey(code)));
            return;
          }
          user = await addFriendMutation.mutateAsync({ email, sendInviteEmail: false });
          inviteFailed = true;
        }
        users.push(user.id);
      }
      await addMembersMutation.mutateAsync({ groupId: group.id, userIds: [...new Set(users)] });
      void utils.group.getGroupDetails.invalidate({ groupId: group.id }).catch(console.error);
      if (inviteFailed) {
        toast.warning(t('ui.invitation.group_partial_success'));
      }
      setOpen(false);
      setInputValue('');
      setUserIds({});
      setSendInvite(false);
    } catch {
      toast.error(t('errors.add_member_failed'));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <AppDrawer
      trigger={children}
      onTriggerClick={() => setOpen(true)}
      open={open}
      title={t('group_details.no_members.add_members_details.title')}
      leftAction={t('actions.cancel')}
      actionTitle={
        saving
          ? t('ui.invitation.adding')
          : t('group_details.no_members.add_members_details.add_to_split_pro')
      }
      actionOnClick={() => void onSave()}
      actionDisabled={saving || (!isEmail.success && 0 === selectedIds.length)}
      className="h-[85vh]"
      dismissible={!saving}
      shouldCloseOnLeftAction={false}
      leftActionOnClick={handleClose}
      onClose={handleClose}
      onOpenChange={(state) => {
        if (!state) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}
    >
      <Input
        className="mt-8 w-full text-lg"
        placeholder={t('group_details.no_members.add_members_details.placeholder')}
        value={inputValue}
        disabled={saving}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <InvitationOption
        enabled={enableSendingInvites}
        checked={sendInvite}
        onCheckedChange={setSendInvite}
        disabled={saving}
      />
      <div className="mt-4 flex flex-col gap-4">
        {emptyReason ? (
          <p className="text-center text-sm text-gray-400">
            {t(`ui.group_people_list_empty.${emptyReason}`)}
          </p>
        ) : null}
        {filteredUsers?.map((friend) => (
          <Button
            variant="ghost"
            disabled={saving}
            key={friend.id}
            className="focus:text-foreground flex items-center justify-between px-0"
            onClick={() => onUserSelect(friend.id)}
          >
            <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
              <EntityAvatar entity={friend} />
              <p>{displayName(friend)}</p>
            </div>
            <div>{userIds[friend.id] ? <CheckIcon className="text-primary h-4 w-4" /> : null}</div>
          </Button>
        ))}
      </div>
    </AppDrawer>
  );
};

export default AddMembers;
