import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from "i18next-http-backend";
import { initReactI18next } from 'react-i18next';

export const supportedLngs = {
  en: "English",
};


i18next
  .use(HttpApi)
  .use(LanguageDetector) // Use the language detector
  .use(initReactI18next) // Pass the i18n instance to react-i18next
  .init({
    supportedLngs: Object.keys(supportedLngs),
    fallbackLng: 'en', // Fallback language if the detector fails
    //detection: {
      // Options for language detection
    //  order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
    //  caches: ['cookie'],
    //},
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

  export default i18next;