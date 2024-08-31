import React, { useState } from 'react';
import { Button } from '~/components/ui/button';
import { InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/solid';
import { api } from '~/utils/api';
import {
  AppDrawer,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTrigger,
} from '~/components/ui/drawer';
import clsx from 'clsx';
import { UserAvatar } from '../ui/avatar';
import { type Group, type GroupUser } from '@prisma/client';
import { CheckIcon, SendIcon, UserPlus } from 'lucide-react';
import { Input } from '../ui/input';
import { z } from 'zod';

const AddMembers: React.FC<{
  group: Group & { groupUsers: Array<GroupUser> };
  children: React.ReactNode;
}> = ({ group, children }) => {
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
    (f) =>
      !groupUserMap[f.id] && (f.name ?? f.email)?.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function onUserSelect(userId: number) {
    setUserIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function onSave(userIds: Record<number, boolean>) {
    const users = [];

    for (const userId of Object.keys(userIds)) {
      if (userIds[parseInt(userId)]) {
        users.push(parseInt(userId));
      }
    }

    setInputValue('');

    if (users.length === 0) {
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
  }

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

  return (
    <AppDrawer
      trigger={
        <div className="flex items-center justify-center gap-2 lg:w-[180px]">{children}</div>
      }
      onTriggerClick={() => setOpen(true)}
      title="Add members"
      leftAction="Cancel"
      actionOnClick={() => onSave(userIds)}
      className="h-[85vh]"
      shouldCloseOnAction
      actionTitle="Save"
      open={open}
      onClose={() => setOpen(false)}
      onOpenChange={(state) => state !== open && setOpen(state)}
    >
      <div className="">
        <Input
          className="mt-8 w-full text-lg"
          placeholder="Enter name or email"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {!isEmail.success ? (
          <p className="mt-4 text-red-500">Enter valid email</p>
        ) : (
          <div>
            {/* <div className="mt-1 text-orange-600">
              Warning: Don&apos;t use send invite if it&apos;s invalid email. use add to Split Pro
              instead. Your account will be blocked if this feature is misused
            </div> */}
            <div>Note: sending invite is disabled for now because of spam</div>

            <div className="flex justify-center gap-4">
              {/* <Button
                className="mt-4 w-full text-cyan-500"
                variant="outline"
                disabled={!isEmail.success}
                onClick={() => onAddEmailClick(true)}
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {isEmail.success ? 'Send invite to user' : 'Enter valid email'}
              </Button> */}
              <Button
                className="mt-4 w-full text-cyan-500"
                variant="outline"
                disabled={!isEmail.success}
                onClick={() => onAddEmailClick(false)}
              >
                <UserPlusIcon className="mr-2 h-4 w-4" />
                {isEmail.success ? 'Add to Split Pro' : 'Enter valid email'}
              </Button>
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-4">
          {filteredUsers?.map((friend) => (
            <Button
              variant="ghost"
              key={friend.id}
              className="flex items-center justify-between px-0 focus:text-foreground"
              onClick={() => onUserSelect(friend.id)}
            >
              <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
                <UserAvatar user={friend} />
                <p>{friend.name ?? friend.email}</p>
              </div>
              <div>
                {userIds[friend.id] ? <CheckIcon className="h-4 w-4 text-primary" /> : null}
              </div>
            </Button>
          ))}
        </div>
      </div>
    </AppDrawer>
  );
};

export default AddMembers;
