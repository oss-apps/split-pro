import React, { useState } from 'react';
import { Button } from '~/components/ui/button';
import { InformationCircleIcon, UserPlusIcon } from '@heroicons/react/24/solid';
import { api } from '~/utils/api';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '~/components/ui/drawer';
import clsx from 'clsx';
import { UserAvatar } from '../ui/avatar';
import { type Group, type GroupUser } from '@prisma/client';
import { CheckIcon, UserPlus } from 'lucide-react';
import { Input } from '../ui/input';

const AddMembers: React.FC<{
  group: Group & { groupUsers: Array<GroupUser> };
  children: React.ReactNode;
}> = ({ group, children }) => {
  const [userIds, setUserIds] = useState<Record<number, boolean>>({});
  const [inputValue, setInputValue] = useState('');

  const friendsQuery = api.user.getFriends.useQuery();
  const addMembersMutation = api.group.addMembers.useMutation();

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

  function onSave() {
    const users = [];

    for (const userId of Object.keys(userIds)) {
      if (userIds[parseInt(userId)]) {
        users.push(parseInt(userId));
      }
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

    setUserIds({});
  }

  return (
    <Drawer>
      <DrawerTrigger className="flex items-center gap-1">{children}</DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="link" className="px-0">
              <DrawerClose>Cancel</DrawerClose>
            </Button>
            <p className="text-center">Add members</p>
            <Button variant="link" className="px-0" onClick={onSave}>
              <DrawerClose>Save</DrawerClose>
            </Button>
          </div>
          <Input
            className="mt-8 w-full text-lg"
            placeholder="Enter name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="mt-4 flex flex-col gap-4">
            {filteredUsers?.map((friend) => (
              <Button
                variant="ghost"
                key={friend.id}
                className="flex items-center justify-between px-0"
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
      </DrawerContent>
    </Drawer>
  );
};

export default AddMembers;
