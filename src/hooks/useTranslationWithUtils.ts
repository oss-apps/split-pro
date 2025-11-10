import { useTranslation } from 'next-i18next';
import { useCallback, useContext, useMemo } from 'react';
import {
  CurrencyHelpersContext,
  type CurrencyHelpersType,
} from '~/contexts/CurrencyHelpersContext';
import {
  type ParametersExceptTranslation,
  displayName as dn,
  getCurrencyName as gCN,
  generateSplitDescription as gsd,
  toUIDate as tUD,
} from '~/utils/strings';

export const useTranslationWithUtils = (
  namespaces?: string[] | string,
): ReturnType<typeof useTranslation> & {
  displayName: typeof displayName;
  generateSplitDescription: typeof generateSplitDescription;
  toUIDate: typeof toUIDate;
  getCurrencyName: typeof getCurrencyName;
  getCurrencyHelpersCached: (currency: string) => CurrencyHelpersType;
} => {
  if (typeof namespaces === 'string') {
    namespaces = [namespaces];
  }
  if (!namespaces || namespaces.length === 0) {
    namespaces = ['common'];
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

  const context = useContext(CurrencyHelpersContext);

  const getCurrencyHelpersCached = useCallback(
    (currency: string) => {
      if (!context) {
        throw new Error('useCurrencyHelpers must be used within a CurrencyHelpersProvider');
      }
      return context.getCachedCurrencyHelpers(currency, translation.i18n.language);
    },
    [context, translation.i18n.language],
  );

  // @ts-ignore
  return useMemo(
    () => ({
      ...translation,
      displayName,
      generateSplitDescription,
      toUIDate,
      getCurrencyName,
      getCurrencyHelpersCached,
    }),
    [
      translation,
      displayName,
      generateSplitDescription,
      toUIDate,
      getCurrencyName,
      getCurrencyHelpersCached,
    ],
  );
};
