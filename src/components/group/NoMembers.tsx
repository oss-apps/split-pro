import React from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button } from '~/components/ui/button';
import { Share, UserPlus } from 'lucide-react';
import { type Group, type GroupUser } from '@prisma/client';
import AddMembers from './AddMembers';

const NoMembers: React.FC<{
  group: Group & { groupUsers: Array<GroupUser> };
  enableSendingInvites: boolean;
}> = ({ group, enableSendingInvites }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  async function copyToClipboard() {
    const inviteLink = `${window.location.origin}/groups/join-group?groupId=${group.publicId}`;
    await navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <div className=" mt-[50%] flex flex-col items-center justify-center gap-4">
      <p className="mb-4 text-center text-gray-500">No members in the group yet.</p>
      <Button className="w-[200px]">
        <AddMembers group={group} enableSendingInvites={enableSendingInvites}>
          <UserPlus className="h-5 w-5 text-primary-foreground" />
          <p>Add Members</p>
        </AddMembers>
      </Button>
      <p className="text-gray-400">or</p>
      <Button className="flex w-[200px] items-center gap-2" onClick={copyToClipboard}>
        {!isCopied ? (
          <>
            <Share className="h-5 w-5" />
            Share invite link
          </>
        ) : (
          'Copied'
        )}
      </Button>
    </div>
  );
};

export default NoMembers;
