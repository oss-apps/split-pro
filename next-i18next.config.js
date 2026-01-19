/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: "default",
    locales: [
      "default",
      "en",
      "de",
      "fr",
      "it",
      "pl",
      "pt-PT",
      "pt-BR",
      "sv",
      "es-MX",
      "es-AR",
    ],
    localeDetection: false,
  },
  localePath: "./public/locales",
};

export default config;
