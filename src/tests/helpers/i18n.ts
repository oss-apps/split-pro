import i18next from 'i18next';

import categories from '../../../public/locales/en/categories.json';
import common from '../../../public/locales/en/common.json';
import currencies from '../../../public/locales/en/currencies.json';
import home from '../../../public/locales/en/home.json';

export const testI18n = i18next.createInstance();
void testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  initImmediate: false,
  showSupportNotice: false,
  interpolation: { escapeValue: false },
  resources: { en: { categories, common, currencies, home } },
});

export const useTestTranslation = (namespace: string | string[] = 'common') => ({
  t: testI18n.getFixedT('en', namespace),
  ready: true,
  i18n: testI18n,
});
