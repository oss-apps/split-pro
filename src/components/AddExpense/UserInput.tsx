import Router from 'next/router';
import { z } from 'zod';

import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';

import { GroupAvatar, UserAvatar } from '../ui/avatar';

export const UserInput: React.FC<{
  isEditing?: boolean;
}> = ({ isEditing }) => {
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
        console.log('set Remove called 1', group);

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
      });
    }
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-b pb-4">
      {group ? (
        <div className="flex items-center gap-2 rounded-full bg-slate-800 p-0.5 pr-4">
          <GroupAvatar name={group.name} size={30} />
          <p className="text-xs">{group.name}</p>
        </div>
      ) : (
        participants.map((p) =>
          p.id !== currentUser?.id ? (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-full bg-slate-800 p-0.5 pr-4"
            >
              <UserAvatar user={p} size={30} />
              <p className="text-xs">{p.name ?? p.email}</p>
            </div>
          ) : null,
        )
      )}

      <input
        type="email"
        placeholder={
          isEditing && !!group
            ? 'Cannot change group while editing'
            : group
              ? 'Press delete to remove group'
              : 1 < participants.length
                ? 'Add more friends'
                : 'Search friends, groups or add email'
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
