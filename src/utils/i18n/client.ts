import { type Locale, de, enUS, es, fr, it, pl, pt, ptBR, sv } from 'date-fns/locale';

export interface SupportedLanguage {
  code: string;
  name: string;
  dateLocale: Locale;
}

export const getSupportedLanguages = (): SupportedLanguage[] => [
  { code: 'en', name: 'English', dateLocale: enUS },
  { code: 'de', name: 'Deutsch', dateLocale: de },
  { code: 'fr', name: 'Français', dateLocale: fr },
  { code: 'it', name: 'Italiano', dateLocale: it },
  { code: 'pl', name: 'Polski', dateLocale: pl },
  { code: 'pt-PT', name: 'Portuguese (Portugal)', dateLocale: pt },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', dateLocale: ptBR },
  { code: 'sv', name: 'Svenska', dateLocale: sv },
  { code: 'es-MX', name: 'Spanish (Mexico)', dateLocale: es },
  { code: 'es-AR', name: 'Spanish (Argentina)', dateLocale: es },
];
