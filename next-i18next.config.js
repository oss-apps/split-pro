// @ts-expect-error i18next-icu's CommonJS export has an invalid ambient module declaration.
import ICUModule from 'i18next-icu/cjs';

const ICU = ICUModule.default ?? ICUModule;

/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'it'],
    localeDetection: false,
  },
  defaultNS: 'common_icu',
  fallbackLng: 'en',
  localePath: './public/locales',
  onPreInitI18next: (i18n) => {
    i18n.use(ICU);
  },
  serializeConfig: false,
};

export default config;
