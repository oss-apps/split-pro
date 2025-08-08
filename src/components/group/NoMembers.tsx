import { type Group, type GroupUser } from '@prisma/client';
import { Share, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';

import { Button } from '~/components/ui/button';

import AddMembers from './AddMembers';

interface NoMembersProps {
  group: Group & { groupUsers: GroupUser[] };
  enableSendingInvites: boolean;
}

const NoMembers: React.FC<NoMembersProps> = ({ group, enableSendingInvites }) => {
  const { t } = useTranslation('groups_details');
  const [isCopied, setIsCopied] = useState(false);

  async function copyToClipboard() {
    const inviteLink = `${window.location.origin}/join-group?groupId=${group.publicId}`;
    await navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <p className="mb-4 text-center text-gray-500">{t('ui.no_members.no_members')}</p>
      <Button className="w-[200px]">
        <AddMembers group={group} enableSendingInvites={enableSendingInvites}>
          <UserPlus className="text-primary-foreground h-5 w-5" />
          <p>{t('ui.no_members.add_members')}</p>
        </AddMembers>
      </Button>
      <p className="text-gray-400">{t('ui.no_members.or')}</p>
      <Button className="flex w-[200px] items-center gap-2" onClick={copyToClipboard}>
        {!isCopied ? (
          <>
            <Share className="h-5 w-5" />
            {t('ui.no_members.invite_link')}
          </>
        ) : (
          t('ui.no_members.copied')
        )}
      </Button>
    </div>
  );
};

export default NoMembers;
