'use client';

import React, { createContext, useMemo } from 'react';
import { getCurrencyHelpers } from '~/utils/numbers';

const CURRENCY_HELPERS_CACHE_LIMIT = 100;
const currencyHelpersCache = new Map<string, CurrencyHelpersType>();

const getCachedCurrencyHelpers = (currency: string, locale = 'en-US'): CurrencyHelpersType => {
  const cacheKey = JSON.stringify([currency, locale]);
  const cachedHelpers = currencyHelpersCache.get(cacheKey);
  if (cachedHelpers) {
    currencyHelpersCache.delete(cacheKey);
    currencyHelpersCache.set(cacheKey, cachedHelpers);
    return cachedHelpers;
  }

  const helpers = getCurrencyHelpers({ currency, locale });
  currencyHelpersCache.set(cacheKey, helpers);
  if (currencyHelpersCache.size > CURRENCY_HELPERS_CACHE_LIMIT) {
    const leastRecentlyUsedKey = currencyHelpersCache.keys().next().value;
    if (leastRecentlyUsedKey !== undefined) {
      currencyHelpersCache.delete(leastRecentlyUsedKey);
    }
  }
  return helpers;
};

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
  const value: CurrencyHelpersContextType = useMemo(
    () => ({
      getCachedCurrencyHelpers,
    }),
    [],
  );

  return (
    <CurrencyHelpersContext.Provider value={value}>{children}</CurrencyHelpersContext.Provider>
  );
};
