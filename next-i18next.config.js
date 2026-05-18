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
      'pl',
      'pt-PT',
      'pt-BR',
      'sv',
      'es',
      'es-MX',
      'es-AR',
      'hu',
    ],
    localeDetection: false,
  },
  localePath: './public/locales',
};

export default config;
