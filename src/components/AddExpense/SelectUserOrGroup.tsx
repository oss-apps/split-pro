import { CheckIcon } from '@heroicons/react/24/outline';
import { UserPlusIcon } from '@heroicons/react/24/solid';
import type { Group, GroupUser, SplitType, User } from '@prisma/client';
import Image from 'next/image';
import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { deserializeDefaultSplit } from '~/lib/defaultSplit';
import {
  getInviteAppErrorCode,
  getInviteErrorToastKey,
  isInviteEmailSendFailed,
} from '~/lib/error/invite';
import { peopleListEmptyReason } from '~/lib/peopleList';

import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { InvitationOption } from '../InvitationOption';

type SelectableGroup = Group & {
  groupUsers: (GroupUser & { user: User })[];
  defaultSplit: {
    splitType: SplitType;
    shares: Record<string, string>;
  } | null;
};

export const SelectUserOrGroup: React.FC<{
  enableSendingInvites: boolean;
}> = ({ enableSendingInvites }) => {
  const { t, displayName } = useTranslationWithUtils();
  const nameOrEmail = useAddExpenseStore((s) => s.nameOrEmail);
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const { addOrUpdateParticipant, removeParticipant, setNameOrEmail, setGroup, setParticipants } =
    useAddExpenseStore((s) => s.actions);

  const friendsQuery = api.user.getFriends.useQuery();
  const discoveryQuery = api.user.getDiscoverableUsers.useQuery();
  const groupsQuery = api.group.getAllGroups.useQuery();
  const addFriendMutation = api.user.inviteFriend.useMutation();

  const [sendInvite, setSendInvite] = useState(false);
  const [adding, setAdding] = useState(false);
  const submitting = useRef(false);

  const isEmail = z.string().email().safeParse(nameOrEmail);

  const searchValue = nameOrEmail.trim().toLowerCase();
  const canSelectGroups = 1 === participants.length;
  const contactsFailed =
    (friendsQuery.isError && undefined === friendsQuery.data) ||
    (discoveryQuery.isError && undefined === discoveryQuery.data) ||
    (canSelectGroups && groupsQuery.isError && undefined === groupsQuery.data);
  const filteredGroups = canSelectGroups
    ? groupsQuery.data?.filter((g) => g.group.name.toLowerCase().includes(searchValue))
    : [];
  const filteredFriends = friendsQuery.data?.filter(
    (f) => !f.deletedAt && displayName(f).toLowerCase().includes(searchValue),
  );

  const filteredOtherUsers = discoveryQuery.data?.filter((user) =>
    displayName(user).toLowerCase().includes(searchValue),
  );

  /* Friends, discoverable users, and groups all count as contacts. */
  const emptyReason = peopleListEmptyReason({
    isLoading:
      contactsFailed ||
      friendsQuery.isPending ||
      discoveryQuery.isPending ||
      (canSelectGroups && groupsQuery.isPending),
    hasAnyContacts:
      0 < (friendsQuery.data?.length ?? 0) ||
      0 < (discoveryQuery.data?.length ?? 0) ||
      (canSelectGroups && 0 < (groupsQuery.data?.length ?? 0)),
    isFiltering: '' !== searchValue,
  });

  const onAddEmailClick = async () => {
    if (!isEmail.success || submitting.current) {
      return;
    }
    submitting.current = true;
    setAdding(true);
    const email = nameOrEmail;
    let inviteFailed = false;
    try {
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
      addOrUpdateParticipant(user);
      if (email === useAddExpenseStore.getState().nameOrEmail) {
        setNameOrEmail('');
      }
      setSendInvite(false);
      if (inviteFailed) {
        toast.warning(t('ui.invitation.expense_partial_success'));
      }
    } catch {
      toast.error(t('errors.add_member_failed'));
    } finally {
      submitting.current = false;
      setAdding(false);
    }
  };

  const onGroupSelect = useCallback(
    (selectedGroup: SelectableGroup) => {
      setGroup(selectedGroup);
      const { currentUser } = useAddExpenseStore.getState();
      if (currentUser) {
        setParticipants([
          currentUser,
          ...selectedGroup.groupUsers.map((gu) => gu.user).filter((u) => u.id !== currentUser.id),
        ]);
      }
      const parsedDefaultSplit = deserializeDefaultSplit(selectedGroup.defaultSplit);
      if (parsedDefaultSplit) {
        useAddExpenseStore
          .getState()
          .actions.applySplitPreset(parsedDefaultSplit.splitType, parsedDefaultSplit.shares);
      }
      setNameOrEmail('');
    },
    [setGroup, setParticipants, setNameOrEmail],
  );

  const handleFriendClick = useCallback(
    (f: User) => {
      const isExisting = participants.some((p) => p.id === f.id);

      if (isExisting) {
        removeParticipant(f.id);
      } else {
        addOrUpdateParticipant(f);
      }
      setNameOrEmail('');
    },
    [participants, removeParticipant, addOrUpdateParticipant, setNameOrEmail],
  );

  if (group) {
    return (
      <div className="mt-4 text-center text-red-500">
        {t('expense_details.add_expense_details.select_user_or_group.only_one_group_time')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-3">
        <InvitationOption
          enabled={enableSendingInvites}
          checked={sendInvite}
          onCheckedChange={setSendInvite}
          disabled={adding}
        />
        <Button
          variant="outline"
          disabled={!isEmail.success || adding}
          onClick={() => void onAddEmailClick()}
        >
          <UserPlusIcon className="mr-2 size-4" />
          {adding
            ? t('ui.invitation.adding')
            : t('expense_details.add_expense_details.select_user_or_group.add_to_split_pro')}
        </Button>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t('ui.invitation.draft_help')}
        </p>
      </div>
      <div>
        {contactsFailed ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            <p>{t('ui.people_list_load_error')}</p>
            <Button
              variant="outline"
              disabled={
                friendsQuery.isFetching ||
                discoveryQuery.isFetching ||
                (canSelectGroups && groupsQuery.isFetching)
              }
              onClick={() => {
                if (friendsQuery.isError) {
                  void friendsQuery.refetch();
                }
                if (discoveryQuery.isError) {
                  void discoveryQuery.refetch();
                }
                if (canSelectGroups && groupsQuery.isError) {
                  void groupsQuery.refetch();
                }
              }}
            >
              {t('actions.retry')}
            </Button>
          </div>
        ) : null}
        {filteredFriends?.length ? (
          <>
            <div className="font-normal text-gray-500">{t('actors.friends')}</div>
            {filteredFriends.map((f) => (
              <button
                disabled={adding}
                key={f.id}
                className="flex w-full items-center justify-between border-b border-gray-900 py-4"
                onClick={() => handleFriendClick(f)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <EntityAvatar entity={f} size={35} />
                  <div className="truncate">{displayName(f)}</div>
                </div>
                {participants.some((p) => p.id === f.id) ? (
                  <div>
                    <CheckIcon className="text-primary h-4 w-4" />
                  </div>
                ) : null}
              </button>
            ))}
          </>
        ) : null}

        {filteredOtherUsers?.length ? (
          <>
            <div className="font-normal text-gray-500">{t('actors.other_users')}</div>
            {filteredOtherUsers.map((f) => (
              <button
                disabled={adding}
                key={f.id}
                className="flex w-full items-center justify-between border-b border-gray-900 py-4"
                onClick={() => handleFriendClick(f)}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <EntityAvatar entity={f} size={35} />
                  <div className="truncate">{displayName(f)}</div>
                </div>
                {participants.some((p) => p.id === f.id) ? (
                  <div>
                    <CheckIcon className="text-primary h-4 w-4" />
                  </div>
                ) : null}
              </button>
            ))}
          </>
        ) : null}

        {/*Can't select multiple groups or groups with outside ppl */}
        {filteredGroups?.length && 1 === participants.length ? (
          <>
            <div className="mt-8 text-gray-500">{t('actors.groups')}</div>
            <div className="mt-2 flex flex-col gap-1">
              {filteredGroups.map((g) => (
                <button
                  disabled={adding}
                  key={g.groupId}
                  className="border-b border-gray-900 py-4"
                  onClick={() => onGroupSelect(g.group)}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <EntityAvatar entity={g.group} size={35} />
                    <p className="truncate">{g.group.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {!contactsFailed &&
        0 === filteredFriends?.length &&
        0 === filteredOtherUsers?.length &&
        0 === filteredGroups?.length ? (
          <div className="mt-[30%] flex flex-col items-center justify-center gap-8 transition-discrete starting:opacity-0">
            <Image
              alt={t('expense_details.add_expense_details.select_user_or_group.empty_image_alt')}
              src="/empty_img.svg"
              width={250}
              height={250}
            />
            {emptyReason ? (
              <p className="text-center text-sm text-gray-400">
                {t(`ui.people_list_empty.${emptyReason}`)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
