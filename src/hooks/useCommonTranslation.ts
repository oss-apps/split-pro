import { type User } from '@prisma/client';
import { useTranslation } from 'next-i18next';
import { useCallback } from 'react';
import { displayName as dn } from '~/utils/strings';

export const useTranslationWithUtils = (namespaces?: string[]) => {
  if (!namespaces || namespaces.length === 0) {
    namespaces = ['common'];
  } else if (!namespaces.includes('common')) {
    namespaces.push('common');
  }
  const translation = useTranslation(namespaces);

  const displayName = useCallback(
    (user: Pick<User, 'name' | 'email' | 'id'> | undefined, currentUserId?: number): string => {
      if (!user) {
        return '';
      }
      return dn(user, currentUserId, translation.t);
    },
    [translation.t],
  );
  return {
    ...translation,
    displayName,
  };
};
