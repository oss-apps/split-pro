import { type TFunction } from 'next-i18next';
import { type CurrencyCode } from '~/lib/currency';
export interface SupportedLanguage {
  code: string;
  name: string;
}

export const getSupportedLanguages = (): SupportedLanguage[] => [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'sv', name: 'Svenska' },
];

/**
 * Get the localized name of a currency
 * @param code - Currency code (e.g., 'USD', 'EUR')
 * @param t - Translation function from useTranslation
 * @param plural - Whether to get the plural form
 * @returns Localized currency name, fallback to currency code if translation doesn't exist
 */
export function getLocalizedCurrencyName(code: CurrencyCode, t: TFunction, plural = false): string {
  const translationKey = `ui.currency.currency_list.${code}.${plural ? 'name_plural' : 'name'}`;
  const translatedName = t(translationKey);

  // Fallback to currency code if translation doesn't exist
  if (translatedName !== translationKey) {
    return translatedName;
  }

  // Final fallback to currency code
  return code;
}
