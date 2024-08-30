import { api } from '~/utils/api';
import React, { useEffect } from 'react';
import { GroupAvatar, UserAvatar } from '../ui/avatar';
import { useAddExpenseStore } from '~/store/addStore';
import { z } from 'zod';
import { Button } from '../ui/button';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import { CheckIcon } from '@heroicons/react/24/outline';
import { type Group, type GroupUser, type User } from '@prisma/client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { SendIcon } from 'lucide-react';
import '../../i18n/config';
import { useTranslation } from 'react-i18next';

export const SelectUserOrGroup: React.FC = () => {
  const nameOrEmail = useAddExpenseStore((s) => s.nameOrEmail);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const { addOrUpdateParticipant, removeParticipant, setNameOrEmail, setGroup, setParticipants } =
    useAddExpenseStore((s) => s.actions);

    const { t, ready } = useTranslation();
    // Ensure i18n is ready
    useEffect(() => {
      if (!ready) return; // Don't render the component until i18n is ready
    }, [ready]);

  const friendsQuery = api.user.getFriends.useQuery();
  const groupsQuery = api.group.getAllGroups.useQuery();
  const addFriendMutation = api.user.inviteFriend.useMutation();

  const isEmail = z.string().email().safeParse(nameOrEmail);

  const filteredGroups = groupsQuery.data?.filter((g) =>
    g.group.name.toLowerCase().includes(nameOrEmail.toLowerCase()),
  );
  const filteredFriends = friendsQuery.data?.filter((f) =>
    (f.name ?? f.email)?.toLowerCase().includes(nameOrEmail.toLowerCase()),
  );

  function onAddEmailClick(invite = false) {
    if (isEmail.success) {
      addFriendMutation.mutate(
        { email: nameOrEmail, sendInviteEmail: invite },
        {
          onSuccess: (user) => {
            removeParticipant(-1);
            addOrUpdateParticipant(user);
            setNameOrEmail('');
          },
        },
      );
      addOrUpdateParticipant({
        id: -1,
        name: nameOrEmail,
        email: nameOrEmail,
        emailVerified: new Date(),
        image: null,
        currency: 'USD',
      });
      // add email to split pro
    }
  }

  function onGroupSelect(group: Group & { groupUsers: Array<GroupUser & { user: User }> }) {
    setGroup(group);
    const { currentUser } = useAddExpenseStore.getState();
    if (currentUser) {
      setParticipants([
        currentUser,
        ...group.groupUsers.map((gu) => gu.user).filter((u) => u.id !== currentUser.id),
      ]);
    }
    setNameOrEmail('');
  }

  if (group) {
    return (
      <div className="mt-4 text-center text-red-500">{t('select_group_error')}</div>
    );
  }

  return (
    <div className="mt-1 ">
      <div className="flex gap-4">
        <Button
          className="mt-4 w-full text-cyan-500 hover:text-cyan-500"
          variant="outline"
          disabled={!isEmail.success}
          onClick={() => onAddEmailClick(false)}
        >
          <SendIcon className="mr-2 h-4 w-4" />
          {t('addmember_invite_user')}
        </Button>
        <Button
          className="mt-4 w-full text-cyan-500 hover:text-cyan-500"
          variant="outline"
          disabled={!isEmail.success}
          onClick={() => onAddEmailClick(true)}
        >
          <UserPlusIcon className="mr-2 h-4 w-4" />
          {t('addmember_add_to_split')}
        </Button>
      </div>
      <div className="mt-2">
        {filteredFriends?.length ? (
          <>
            <div className=" font-normal text-gray-500">{t('Friends')}</div>
            {filteredFriends.map((f) => {
              const isExisting = participants.some((p) => p.id === f.id);

              return (
                <button
                  key={f.id}
                  className="flex w-full items-center justify-between border-b border-gray-900 py-4"
                  onClick={() => {
                    if (isExisting) {
                      removeParticipant(f.id);
                    } else {
                      addOrUpdateParticipant(f);
                    }
                    setNameOrEmail('');
                  }}
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar user={f} size={35} />
                    <div>{f.name ?? f.email}</div>
                  </div>
                  {participants.some((p) => p.id === f.id) ? (
                    <div>
                      <CheckIcon className="h-4 w-4 text-primary" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </>
        ) : null}

        {/*Can't select multiple groups or groups with outside ppl */}
        {filteredGroups?.length && participants.length === 1 ? (
          <>
            <div className="mt-8 text-gray-500">{t('groups')}</div>
            <div className="mt-2 flex flex-col gap-1">
              {filteredGroups.map((g) => (
                <button
                  key={g.groupId}
                  className="border-b border-gray-900 py-4"
                  onClick={() => onGroupSelect(g.group)}
                >
                  <div className="flex items-center gap-4">
                    <GroupAvatar name={g.group.name} size={35} />
                    <p>{g.group.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {filteredFriends?.length === 0 && filteredGroups?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-[30%] flex flex-col items-center justify-center gap-20"
          >
            <Image alt="empty user image" src="/empty_img.svg" width={250} height={250} />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
