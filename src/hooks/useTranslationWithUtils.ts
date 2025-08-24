import { type User } from '@prisma/client';
import { useTranslation } from 'next-i18next';
import { useCallback } from 'react';
import { displayName as dn, generateSplitDescription as gsd } from '~/utils/strings';
import { type AddExpenseState, type Participant } from '~/store/addStore';

export const useTranslationWithUtils = (
  namespaces?: string[],
): ReturnType<typeof useTranslation> & { 
  displayName: typeof displayName;
  generateSplitDescription: typeof generateSplitDescription;
} => {
  if (!namespaces || namespaces.length === 0) {
    namespaces = ['common'];
  } else if (!namespaces.includes('common')) {
    namespaces.push('common');
  }
  const translation = useTranslation(namespaces);

  const displayName = useCallback(
    (user?: Pick<User, 'name' | 'email' | 'id'> | null, currentUserId?: number): string =>
      dn(user, currentUserId, translation.t),
    [translation.t],
  );

  const generateSplitDescription = useCallback(
    (
      splitType: Parameters<typeof gsd>[0],
      participants: Parameters<typeof gsd>[1],
      splitShares: Parameters<typeof gsd>[2],
      paidBy: Parameters<typeof gsd>[3],
      currentUser: Parameters<typeof gsd>[4],
    ): string =>
      gsd(splitType, participants, splitShares, paidBy, currentUser, translation.t),
    [translation.t],
  );

  // @ts-ignore
  return {
    ...translation,
    displayName,
    generateSplitDescription,
  };
};
