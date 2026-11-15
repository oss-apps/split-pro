import { useTranslation } from 'next-i18next';
import { useCallback, useContext, useMemo } from 'react';
import {
  CurrencyHelpersContext,
  type CurrencyHelpersType,
} from '~/contexts/CurrencyHelpersContext';
import { toUIPercentage as tUP } from '~/utils/numbers';
import {
  type ParametersExceptTranslation,
  displayName as dn,
  getCurrencyName as gCN,
  generateSplitDescription as gsd,
  toUIDate as tUD,
} from '~/utils/strings';

type ParametersExceptLocale<F> = F extends (locale: string, ...rest: infer R) => any ? R : never;

export const useTranslationWithUtils = (
  namespaces?: string[] | string,
): Pick<ReturnType<typeof useTranslation>, 't' | 'i18n' | 'ready'> & {
  displayName: typeof displayName;
  generateSplitDescription: typeof generateSplitDescription;
  toUIDate: typeof toUIDate;
  getCurrencyName: typeof getCurrencyName;
  getCurrencyHelpersCached: (currency: string) => CurrencyHelpersType;
  toUIPercentage: (...args: ParametersExceptLocale<typeof tUP>) => string;
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

  const toUIPercentage = useCallback(
    (...args: ParametersExceptLocale<typeof tUP>): string =>
      tUP(translation.i18n.language, ...args),
    [translation.i18n.language],
  );

  return useMemo(
    () => ({
      t: translation.t,
      i18n: translation.i18n,
      ready: translation.ready,
      displayName,
      generateSplitDescription,
      toUIDate,
      getCurrencyName,
      getCurrencyHelpersCached,
      toUIPercentage,
    }),
    [
      translation,
      displayName,
      generateSplitDescription,
      toUIDate,
      getCurrencyName,
      getCurrencyHelpersCached,
      toUIPercentage,
    ],
  );
};
