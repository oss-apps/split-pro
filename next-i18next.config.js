// @ts-expect-error i18next-icu's CommonJS export has an invalid ambient module declaration.
import ICUModule from 'i18next-icu/cjs';

const ICU = ICUModule.default ?? ICUModule;

/** @param {string} lng */
const parseLngForICU = (lng) =>
  'default' === lng ? 'en' : 'ca@valencia' === lng ? 'ca-ES-valencia' : lng;

/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: 'default',
    locales: [
      'default',
      'en',
      'de',
      'fr',
      'it',
      'cs',
      'nl',
      'pl',
      'pt-PT',
      'pt-BR',
      'sv',
      'es',
      'es-MX',
      'es-AR',
      'id',
      'hu',
    ],
    localeDetection: false,
  },
  fallbackLng: 'en',
  localePath: './public/locales',
  i18nFormat: {
    // Keep the existing route and Weblate locale codes while ICU uses valid BCP 47 tags.
    parseLngForICU,
  },
  onPreInitI18next: (i18n) => {
    i18n.use(ICU);
  },
  serializeConfig: false,
};

export default config;
