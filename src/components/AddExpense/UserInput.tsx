import { useTranslation } from 'next-i18next';
import Router from 'next/router';
import { z } from 'zod';

import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';

export const UserInput: React.FC<{
  isEditing?: boolean;
}> = ({ isEditing }) => {
  const { t } = useTranslation('expense_details');
  const {
    setNameOrEmail,
    removeLastParticipant,
    removeParticipant,
    addOrUpdateParticipant,
    setParticipants,
    setGroup,
  } = useAddExpenseStore((s) => s.actions);
  const nameOrEmail = useAddExpenseStore((s) => s.nameOrEmail);
  const participants = useAddExpenseStore((s) => s.participants);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const group = useAddExpenseStore((s) => s.group);

  const addFriendMutation = api.user.inviteFriend.useMutation();

  const isEmail = z.string().email().safeParse(nameOrEmail);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ('Backspace' === e.key && '' === nameOrEmail) {
      if (group) {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete('groupId');
        Router.push(`${currentPath}?${searchParams.toString()}`).catch(console.error);

        setGroup(undefined);

        if (currentUser) {
          setParticipants([currentUser]);
        }
      } else {
        removeLastParticipant(); // Assuming deleteUser is the function you want to call
      }
    } else if ('Enter' === e.key && isEmail.success) {
      addFriendMutation.mutate(
        { email: nameOrEmail.toLowerCase() },
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
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-b pb-4">
      {group ? (
        <div className="flex items-center gap-2 rounded-full bg-slate-800 p-0.5 pr-4">
          <EntityAvatar entity={group} size={30} />
          <p className="text-xs">{group.name}</p>
        </div>
      ) : (
        participants.map((p) =>
          p.id !== currentUser?.id ? (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full bg-slate-800 p-0.5 pr-4"
            >
              <EntityAvatar entity={p} size={30} />
              <p className="text-xs">{p.name ?? p.email}</p>
            </div>
          ) : null,
        )
      )}

      <input
        type="email"
        placeholder={
          isEditing && !!group
            ? t('ui.add_expense_details.user_input.cannot_change_group')
            : group
              ? t('ui.add_expense_details.user_input.remove_group')
              : 1 < participants.length
                ? t('ui.add_expense_details.user_input.add_more_friends')
                : t('ui.add_expense_details.user_input.search_friends')
        }
        value={nameOrEmail}
        onChange={(e) => setNameOrEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-w-[100px] grow bg-transparent outline-hidden placeholder:text-sm focus:ring-0"
        autoFocus
        disabled={isEditing && !!group}
      />
    </div>
  );
};
