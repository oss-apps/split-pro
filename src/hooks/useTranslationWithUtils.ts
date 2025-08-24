import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { displayName, generateSplitDescription } from '~/utils/strings';

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

  // @ts-ignore
  return useMemo(
    () => ({
      ...translation,
      displayName,
      generateSplitDescription,
    }),
    [translation],
  );
};
