import { resolveSupportedLocale } from '~/utils/i18n/resolveLocale';

describe('resolveSupportedLocale', () => {
  const supported = ['en', 'it', 'pt-PT'];
  const historicalLocales = [
    'cs',
    'de',
    'el',
    'es',
    'es-AR',
    'es-MX',
    'fr',
    'he',
    'hi',
    'hu',
    'ja',
    'ne',
    'nl',
    'pl',
    'pt-BR',
    'pt-PT',
    'ru',
    'sk',
    'sq',
    'sv',
    'zh-Hant',
  ];

  it('keeps an exact supported locale', () => {
    expect(resolveSupportedLocale('it', supported, 'en')).toBe('it');
    expect(resolveSupportedLocale('pt-PT', supported, 'en')).toBe('pt-PT');
  });

  it('maps a generic language to its only supported regional variant', () => {
    expect(resolveSupportedLocale('pt', supported, 'en')).toBe('pt-PT');
  });

  it.each(historicalLocales)('keeps the historical locale %s when it is restored', (locale) => {
    expect(resolveSupportedLocale(locale, ['en', ...historicalLocales], 'en')).toBe(locale);
  });

  it('uses a configured generic language for regional requests', () => {
    expect(resolveSupportedLocale('pt-BR', ['en', 'pt', 'pt-PT'], 'en')).toBe('pt');
    expect(resolveSupportedLocale('es-CL', ['en', 'es', 'es-AR', 'es-MX'], 'en')).toBe('es');
  });

  it('maps a generic language to a restored script variant', () => {
    expect(resolveSupportedLocale('zh', ['en', 'zh-Hant'], 'en')).toBe('zh-Hant');
  });

  it('canonicalizes locale casing and separators', () => {
    expect(resolveSupportedLocale('pt-pt', supported, 'en')).toBe('pt-PT');
    expect(resolveSupportedLocale('pt_PT', supported, 'en')).toBe('pt-PT');
  });

  it('falls back when multiple regional variants are ambiguous', () => {
    expect(resolveSupportedLocale('pt', ['en', 'pt-PT', 'pt-BR'], 'en')).toBe('en');
  });

  it('falls back for an invalid locale', () => {
    expect(resolveSupportedLocale('../it', supported, 'en')).toBe('en');
  });
});
