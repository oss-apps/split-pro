import { createInstance } from 'i18next';

import categories from '../../../public/locales/en/categories.json';
import common from '../../../public/locales/en/common.json';
import currencies from '../../../public/locales/en/currencies.json';
import home from '../../../public/locales/en/home.json';
import config from '../../../next-i18next.config.js';

export const testI18n = createInstance();
config.onPreInitI18next!(testI18n);
void testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  resources: { en: { categories, common, currencies, home } },
});

export const useTestTranslation = (namespace: string | string[] = 'common') => ({
  t: testI18n.getFixedT('en', namespace),
  ready: true,
  i18n: testI18n,
});
