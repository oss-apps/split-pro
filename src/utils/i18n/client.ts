export interface SupportedLanguage {
  code: string;
  name: string;
}

export const getSupportedLanguages = (): SupportedLanguage[] => [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'sv', name: 'Svenska' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'es-AR', name: 'Spanish (Argentina)' },
];
