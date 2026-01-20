export interface SupportedLanguage {
  code: string;
  name: string;
}

export const getSupportedLanguages = (): SupportedLanguage[] =>
  [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pl', name: 'Polski' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'pt-PT', name: 'Português (Portugal)' },
    { code: 'es', name: 'Español' },
    { code: 'es-MX', name: 'Español (Mexico)' },
    { code: 'es-AR', name: 'Español (Argentina)' },
    { code: 'sv', name: 'Svenska' },
    { code: 'hu', name: 'Magyar' },
  ].sort((a, b) => a.name.localeCompare(b.name));
