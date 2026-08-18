import { type SSRConfig } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from '@/next-i18next.config.js';
import { resolveSupportedLocale } from './resolveLocale';

export const customServerSideTranslations = async (
  locale: string | undefined,
  namespaces: string[],
): Promise<SSRConfig> => {
  const resolvedLocale = resolveSupportedLocale(
    locale,
    i18nConfig.i18n.locales,
    i18nConfig.i18n.defaultLocale,
  );
  return await serverSideTranslations(resolvedLocale, namespaces, i18nConfig);
};

export const withI18nStaticProps =
  (namespaces: string[] = ['common_icu']) =>
  async ({ locale }: { locale: string }) => ({
    props: {
      ...(await customServerSideTranslations(locale, namespaces)),
    },
  });
