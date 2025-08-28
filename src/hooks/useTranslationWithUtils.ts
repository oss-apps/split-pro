import { useTranslation } from 'next-i18next';
import { useCallback, useMemo } from 'react';
import {
  type ParametersExceptTranslation,
  displayName as dn,
  getCurrencyName as gCN,
  generateSplitDescription as gsd,
  toUIDate as tUD,
} from '~/utils/strings';

export const useTranslationWithUtils = (
  namespaces?: string[],
): ReturnType<typeof useTranslation> & {
  displayName: typeof displayName;
  generateSplitDescription: typeof generateSplitDescription;
  toUIDate: typeof toUIDate;
  getCurrencyName: typeof getCurrencyName;
} => {
  if (!namespaces || namespaces.length === 0) {
    namespaces = ['common'];
  } else if (!namespaces.includes('common')) {
    namespaces.push('common');
  }
  const translation = useTranslation(namespaces);

  const displayName = useCallback(
    (...args: ParametersExceptTranslation<typeof dn>): string => dn(translation.t, ...args),
    [translation.t],
  );

  const generateSplitDescription = useCallback(
    (...args: ParametersExceptTranslation<typeof gsd>): string => gsd(translation.t, ...args),
    [translation.t],
  );

  const toUIDate = useCallback(
    (...args: ParametersExceptTranslation<typeof tUD>): string => tUD(translation.t, ...args),
    [translation.t],
  );

  const getCurrencyName = useCallback(
    (...args: ParametersExceptTranslation<typeof gCN>): string => gCN(translation.t, ...args),
    [translation.t],
  );

  // @ts-ignore
  return useMemo(
    () => ({ ...translation, displayName, generateSplitDescription, toUIDate, getCurrencyName }),
    [translation, displayName, generateSplitDescription, toUIDate, getCurrencyName],
  );
};
