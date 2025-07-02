import { type User } from '@prisma/client';
import { useTranslation } from 'next-i18next';
import { useCallback } from 'react';
import { displayName as dn } from '~/utils/strings';

export const useCommonTranslation = () => {
  const { t, ready } = useTranslation('common');

  const displayName = useCallback(
    (user: Pick<User, 'name' | 'email' | 'id'> | undefined, currentUserId?: number): string => {
      if (!user) return '';
      return dn(user, currentUserId, t);
    },
    [t],
  );
  return {
    t,
    ready,
    displayName,
  };
};
