import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { type CurrencyCode, isCurrencyCode } from '~/lib/currency';

export const SHOW_ALL_VALUE = '__SHOW_ALL__' as const;

const DEFAULT_KEY = 'global';

export type CurrencyPreference = CurrencyCode | typeof SHOW_ALL_VALUE;

interface CurrencyPreferenceState {
  preferences: Record<string, CurrencyPreference>;
  setPreference: (key?: number | string, currency?: string) => void;
  getPreference: (key?: number | string) => CurrencyPreference;
  clearPreference: (key?: number | string) => void;
}

export const useCurrencyPreferenceStore = create<CurrencyPreferenceState>()(
  persist(
    (set, get) => ({
      preferences: {},
      setPreference: (key = DEFAULT_KEY, currency = SHOW_ALL_VALUE) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: isCurrencyCode(currency) ? currency : SHOW_ALL_VALUE,
          },
        })),
      getPreference: (key = DEFAULT_KEY) => get().preferences[key] || SHOW_ALL_VALUE,
      clearPreference: (key = DEFAULT_KEY) =>
        set((state) => {
          const { [key]: _, ...rest } = state.preferences;
          return { preferences: rest };
        }),
    }),
    {
      name: 'currency-preferences', // sessionStorage key
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
