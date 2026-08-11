interface ParsedLocale {
  code: string;
  locale: Intl.Locale;
}

const parseLocale = (code: string): Intl.Locale | null => {
  try {
    return new Intl.Locale(code.replaceAll('_', '-'));
  } catch {
    return null;
  }
};

export const resolveSupportedLocale = (
  requestedLocale: string | undefined,
  supportedLocales: readonly string[],
  fallbackLocale: string,
): string => {
  const supported = supportedLocales.flatMap<ParsedLocale>((code) => {
    const locale = parseLocale(code);
    return locale ? [{ code, locale }] : [];
  });
  const parsedFallback = parseLocale(fallbackLocale);
  const fallback =
    supported.find(({ locale }) => locale.toString() === parsedFallback?.toString())?.code ??
    supported[0]?.code;

  if (!fallback) {
    throw new Error('At least one valid supported locale is required');
  }

  if (!requestedLocale) {
    return fallback;
  }

  const requested = parseLocale(requestedLocale);
  if (!requested) {
    return fallback;
  }

  const exact = supported.find(({ locale }) => locale.toString() === requested.toString());
  if (exact) {
    return exact.code;
  }

  const generic = supported.find(
    ({ locale }) => locale.language === requested.language && locale.toString() === locale.language,
  );
  if (generic) {
    return generic.code;
  }

  const variants = supported.filter(({ locale }) => locale.language === requested.language);
  return 1 === variants.length ? variants[0]!.code : fallback;
};
