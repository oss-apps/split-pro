export interface SupportedLanguage {
  code: string;
  name: string;
}

export const getSupportedLanguages = (): SupportedLanguage[] => [
  { code: 'en', name: 'English' },
  { code: 'it', name: 'Italiano' },
];
