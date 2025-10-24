'use client';

import React, { createContext, useCallback, useMemo } from 'react';
import { getCurrencyHelpers } from '~/utils/numbers';

export type CurrencyHelpersType = ReturnType<typeof getCurrencyHelpers>;

interface CurrencyHelpersContextType {
  getCachedCurrencyHelpers: (currency: string, locale?: string) => CurrencyHelpersType;
}

export const CurrencyHelpersContext = createContext<CurrencyHelpersContextType | undefined>(
  undefined,
);

interface CurrencyHelpersProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that caches currency helpers to avoid recreating expensive Intl.NumberFormat instances.
 * The cache is indexed by currency code and locale combination.
 */
export const CurrencyHelpersProvider: React.FC<CurrencyHelpersProviderProps> = ({ children }) => {
  // Cache map: key is "currency|locale"
  const cache = useMemo(() => new Map<string, CurrencyHelpersType>(), []);

  const getCachedCurrencyHelpers = useCallback(
    (currency: string, locale = 'en-US') => {
      const cacheKey = `${currency}|${locale}`;

      // Return cached helpers if available
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)!;
      }

      // Create new helpers and cache them
      const helpers = getCurrencyHelpers({ currency, locale });
      cache.set(cacheKey, helpers);

      return helpers;
    },
    [cache],
  );

  const value: CurrencyHelpersContextType = useMemo(
    () => ({
      getCachedCurrencyHelpers,
    }),
    [getCachedCurrencyHelpers],
  );

  return (
    <CurrencyHelpersContext.Provider value={value}>{children}</CurrencyHelpersContext.Provider>
  );
};
