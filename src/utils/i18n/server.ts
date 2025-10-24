import { type SSRConfig } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from '@/next-i18next.config.js';
import { registerICU } from './registerICU';

registerICU();

export const customServerSideTranslations = async (
  locale: string | undefined,
  namespaces: string[],
): Promise<SSRConfig> => {
  locale ??= 'en';
  return await serverSideTranslations(locale, namespaces, i18nConfig);
};

export const withI18nStaticProps =
  (namespaces: string[] = ['common']) =>
  async ({ locale }: { locale: string }) => ({
    props: {
      ...(await customServerSideTranslations(locale, namespaces)),
    },
  });
