import { UserPlusIcon } from '@heroicons/react/24/solid';
import { type Group, type GroupUser } from '@prisma/client';
import { clsx } from 'clsx';
import { CheckIcon, SendIcon } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { z } from 'zod';

import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';
import { Input } from '../ui/input';

const AddMembers: React.FC<{
  enableSendingInvites: boolean;
  group: Group & { groupUsers: GroupUser[] };
  children: React.ReactNode;
}> = ({ group, children, enableSendingInvites }) => {
  const { t } = useTranslation('groups_details');
  const [open, setOpen] = useState(false);
  const [userIds, setUserIds] = useState<Record<number, boolean>>({});
  const [inputValue, setInputValue] = useState('');

  const friendsQuery = api.user.getFriends.useQuery();
  const addMembersMutation = api.group.addMembers.useMutation();
  const addFriendMutation = api.user.inviteFriend.useMutation();

  const utils = api.useUtils();

  const groupUserMap = group.groupUsers.reduce(
    (acc, gu) => {
      acc[gu.userId] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );

  const filteredUsers = friendsQuery.data?.filter(
    (friend) =>
      !groupUserMap[friend.id] &&
      (friend.name ?? friend.email)?.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function onUserSelect(userId: number) {
    setUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  const onSave = useCallback(
    (userIds: Record<number, boolean>) => {
      const users = [];

      for (const userId of Object.keys(userIds)) {
        if (userIds[parseInt(userId)]) {
          users.push(parseInt(userId));
        }
      }

      setInputValue('');

      if (0 === users.length) {
        return;
      }

      addMembersMutation.mutate(
        {
          groupId: group.id,
          userIds: users,
        },
        {
          onSuccess: () => {
            utils.group.getGroupDetails.invalidate({ groupId: group.id }).catch(console.error);
          },
        },
      );
      setOpen(false);
      setUserIds({});
    },
    [addMembersMutation, group.id, utils],
  );

  const isEmail = z.string().email().safeParse(inputValue);

  function onAddEmailClick(invite = false) {
    if (isEmail.success) {
      addFriendMutation.mutate(
        { email: inputValue.toLowerCase(), sendInviteEmail: invite },
        {
          onSuccess: (user) => {
            onSave({ ...userIds, [user.id]: true });
          },
        },
      );
    }
  }

  const handleTriggerClick = useCallback(() => setOpen(true), []);

  const handleActionClick = useCallback(() => onSave(userIds), [onSave, userIds]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <AppDrawer
      trigger={children}
      onTriggerClick={handleTriggerClick}
      title={t('ui.no_members.add_members_details.title')}
      leftAction={t('ui.actions.cancel', { ns: 'common' })}
      actionTitle={t('ui.actions.save', { ns: 'common' })}
      actionOnClick={handleActionClick}
      className="h-[85vh]"
      shouldCloseOnAction
      onClose={handleClose}
      onOpenChange={(state) => state !== open && setOpen(state)}
    >
      <Input
        className="mt-8 w-full text-lg"
        placeholder={t('ui.no_members.add_members_details.placeholder')}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <div>
        {enableSendingInvites ? (
          <div className="mt-1 text-orange-600">
            {t('ui.no_members.add_members_details.warning')}
          </div>
        ) : (
          <div>{t('ui.no_members.add_members_details.note')}</div>
        )}

        <div className="flex justify-center gap-4">
          {enableSendingInvites && (
            <Button
              className="mt-4 w-full text-cyan-500"
              variant="outline"
              disabled={!isEmail.success}
              onClick={() => onAddEmailClick(true)}
            >
              <SendIcon className="mr-2 h-4 w-4" />
              {isEmail.success
                ? t('ui.no_members.add_members_details.send_invite')
                : t('common:errors.valid_email')}
            </Button>
          )}
          <Button
            className="mt-4 w-full text-cyan-500"
            variant="outline"
            disabled={!isEmail.success}
            onClick={() => onAddEmailClick(false)}
          >
            <UserPlusIcon className="mr-2 h-4 w-4" />
            {isEmail.success
              ? t('ui.no_members.add_members_details.add_to_split_pro')
              : t('common:errors.valid_email')}
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {filteredUsers?.map((friend) => (
          <Button
            variant="ghost"
            key={friend.id}
            className="focus:text-foreground flex items-center justify-between px-0"
            onClick={() => onUserSelect(friend.id)}
          >
            <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
              <EntityAvatar entity={friend} />
              <p>{friend.name ?? friend.email}</p>
            </div>
            <div>{userIds[friend.id] ? <CheckIcon className="text-primary h-4 w-4" /> : null}</div>
          </Button>
        ))}
      </div>
    </AppDrawer>
  );
};

export default AddMembers;
