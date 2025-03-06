import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

void i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
        detection: {
            order: ['navigator'],
            caches: [],
        },
        supportedLngs: ['it', 'en'],
        ns: ['account_details', 'account_page', 'feedback', 'import_from_splitwise', 'language', 'notifications'],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        keySeparator: '/',
    });

export default i18n;