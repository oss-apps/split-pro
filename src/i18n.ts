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
            order: ['navigator', 'htmlTag'],
            caches: ['cookie'],
            convertDetectedLanguage: (lng) => {
                try {
                    const locale = new Intl.Locale(lng);
                    return locale.language;
                } catch (error) {
                    console.warn('Errore nel parsing della lingua:', lng, error);
                    return 'en';
                }
            },
        },
        supportedLngs: ['it', 'en'],
        ns: [
            'account_details',
            'account_page',
            'activity_page',
            'balances_page',
            'expense_add',
            'expense_details',
            'friend_details',
            'groups_details',
            'groups_page',
            'signin_page',
        ],
        nonExplicitSupportedLngs: true,
        load: 'currentOnly',
        keySeparator: '/',
    });

export default i18n;