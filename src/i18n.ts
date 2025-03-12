import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

void i18n
    .use(Backend)
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
        ns: [
            'account_details',
            'account_page',
            'activity_page',
            'add_expense',
            'balances_page',
            'friend_details',
            'groups_details',
            'groups_page',
        ],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        keySeparator: '/',
    });

export default i18n;