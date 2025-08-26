import { CheckIcon } from '@heroicons/react/24/outline';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import { type Group, type GroupUser, type User } from '@prisma/client';
import { SendIcon } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import React from 'react';
import { z } from 'zod';

import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';

export const SelectUserOrGroup: React.FC<{
  enableSendingInvites: boolean;
}> = ({ enableSendingInvites }) => {
  const { t } = useTranslation('expense_details');
  const nameOrEmail = useAddExpenseStore((s) => s.nameOrEmail);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const { addOrUpdateParticipant, removeParticipant, setNameOrEmail, setGroup, setParticipants } =
    useAddExpenseStore((s) => s.actions);

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
        obapiProviderId: null,
        bankingId: null,
        preferredLanguage: '',
      });
      // add email to split pro
    }
  }

  function onGroupSelect(group: Group & { groupUsers: (GroupUser & { user: User })[] }) {
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
      <div className="mt-4 text-center text-red-500">
        {t('ui.add_expense_details.select_user_or_group.only_one_group_time')}
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div>
        <div>
          {enableSendingInvites ? (
            <div className="mt-1 text-orange-600">
              {isEmail.success ? t('ui.add_expense_details.select_user_or_group.warning') : null}
            </div>
          ) : (
            <div>{t('ui.add_expense_details.select_user_or_group.note')}</div>
          )}
        </div>
        <div className="flex justify-center gap-4">
          {enableSendingInvites && (
            <Button
              className="mt-4 w-full text-cyan-500 hover:text-cyan-500"
              variant="outline"
              disabled={!isEmail.success}
              onClick={() => onAddEmailClick(false)}
            >
              <SendIcon className="mr-2 h-4 w-4" />
              {t('ui.add_expense_details.select_user_or_group.send_invite')}
            </Button>
          )}
          <Button
            className="mt-4 w-full text-cyan-500 hover:text-cyan-500"
            variant="outline"
            disabled={!isEmail.success}
            onClick={() => onAddEmailClick(false)}
          >
            <UserPlusIcon className="mr-2 h-4 w-4" />
            {t('ui.add_expense_details.select_user_or_group.add_to_split_pro')}
          </Button>
        </div>
      </div>
      <div className="mt-2">
        {filteredFriends?.length ? (
          <>
            <div className="font-normal text-gray-500">
              {t('ui.actors.friends', { ns: 'common' })}
            </div>
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
                    <EntityAvatar entity={f} size={35} />
                    <div>{f.name ?? f.email}</div>
                  </div>
                  {participants.some((p) => p.id === f.id) ? (
                    <div>
                      <CheckIcon className="text-primary h-4 w-4" />
                    </div>
                  ) : null}
                </button>
              );
            })}
          </>
        ) : null}

        {/*Can't select multiple groups or groups with outside ppl */}
        {filteredGroups?.length && 1 === participants.length ? (
          <>
            <div className="mt-8 text-gray-500">{t('ui.actors.groups', { ns: 'common' })}</div>
            <div className="mt-2 flex flex-col gap-1">
              {filteredGroups.map((g) => (
                <button
                  key={g.groupId}
                  className="border-b border-gray-900 py-4"
                  onClick={() => onGroupSelect(g.group)}
                >
                  <div className="flex items-center gap-4">
                    <EntityAvatar entity={g.group} size={35} />
                    <p>{g.group.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {0 === filteredFriends?.length && 0 === filteredGroups?.length ? (
          <div className="transition-discrete starting:opacity-0 mt-[30%] flex flex-col items-center justify-center gap-20">
            <Image alt="empty user image" src="/empty_img.svg" width={250} height={250} />
          </div>
        ) : null}
      </div>
    </div>
  );
};
