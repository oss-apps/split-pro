import { resolve } from 'path';

/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: 'default',
    locales: ['default', 'en', 'de', 'it', 'pl', 'pt', 'sv'],
    localeDetection: false,
  },
  localePath: resolve('./public/locales'),
};

export default config;
