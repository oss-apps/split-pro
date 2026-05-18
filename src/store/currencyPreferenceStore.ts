import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';

export const SHOW_ALL_VALUE = '__SHOW_ALL__' as const;

const DEFAULT_KEY = 'global';

export type CurrencyPreference = CurrencyCode | typeof SHOW_ALL_VALUE;

const MAX_RECENT_CURRENCIES = 5;

interface CurrencyPreferenceState {
  recentCurrencies: CurrencyCode[];
  userDefaultCurrency: CurrencyCode | null;
  groupDefaultCurrencies: Record<number, CurrencyCode | null>;
  preferences: Record<string, CurrencyPreference>;
  addToRecentCurrencies: (currency: CurrencyCode) => void;
  setUserDefaultCurrency: (currency: CurrencyCode | null) => void;
  setGroupDefaultCurrency: (groupId: number, currency: CurrencyCode | null) => void;
  setPreference: (key?: number | string, currency?: string) => void;
  getPreference: (key?: number | string) => CurrencyPreference;
  clearPreference: (key?: number | string) => void;
}

export const useCurrencyPreferenceStore = create<CurrencyPreferenceState>()(
  persist(
    (set, get) => ({
      recentCurrencies: [],
      userDefaultCurrency: null,
      groupDefaultCurrencies: {},
      preferences: {},
      addToRecentCurrencies: (currency) =>
        set((state) => {
          const updatedRecent = [currency, ...state.recentCurrencies.filter((c) => c !== currency)];
          return { recentCurrencies: updatedRecent.slice(0, MAX_RECENT_CURRENCIES) };
        }),
      setUserDefaultCurrency: (currency) => set((_state) => ({ userDefaultCurrency: currency })),
      setGroupDefaultCurrency: (groupId, currency) =>
        set((state) => ({
          groupDefaultCurrencies: {
            ...state.groupDefaultCurrencies,
            [groupId]: currency,
          },
        })),
      setPreference: (key = DEFAULT_KEY, currency = SHOW_ALL_VALUE) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: isCurrencyCode(currency) ? currency : SHOW_ALL_VALUE,
          },
        })),
      getPreference: (key = DEFAULT_KEY) =>
        get().preferences[key] ||
        (typeof key === 'number' && get().groupDefaultCurrencies[key]) ||
        get().userDefaultCurrency ||
        SHOW_ALL_VALUE,
      clearPreference: (key = DEFAULT_KEY) =>
        set((state) => {
          const { [key]: _, ...rest } = state.preferences;
          return { preferences: rest };
        }),
    }),
    {
      name: 'currency-preferences', // SessionStorage key
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
