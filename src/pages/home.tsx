import {
  ArrowRight,
  Banknote,
  Bell,
  FileUp,
  GitFork,
  Globe,
  Import,
  Split,
  Users,
} from 'lucide-react';
import { type GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { BackgroundGradient } from '~/components/ui/background-gradient';
import { Button } from '~/components/ui/button';
import { env } from '~/env';

import { LanguageSelector } from '~/components/ui/language-selector';
import { customServerSideTranslations } from '~/utils/i18n/server';

export default function Home({ isCloud }: { isCloud: boolean }) {
  const { t } = useTranslation('home');

  return (
    <>
      {isCloud && (
        <Head>
          {'production' === process.env.NODE_ENV && (
            <>
              <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js" />
              <noscript>
                <Image
                  src="https://queue.simpleanalyticscdn.com/noscript.gif"
                  alt=""
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </noscript>
            </>
          )}
        </Head>
      )}
      <main className="min-h-screen">
        <nav className="sticky mx-auto flex max-w-5xl items-center justify-between px-4 py-4 lg:px-0 lg:py-5">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-medium">{t('nav.app_name')}</p>
          </div>
          <div className="flex items-center gap-8">
            <LanguageSelector />
            <Link href="/terms">{t('nav.terms')}</Link>
            <Link href="/privacy">{t('nav.privacy')}</Link>
          </div>
        </nav>
        <div className="mx-auto mt-20 flex w-full items-start justify-center gap-16 px-4 lg:max-w-5xl lg:px-0">
          <div>
            <div className="mb-32 text-center lg:mb-0 lg:h-[70vh] lg:text-left">
              <h1 className="max-w-3xl text-center text-2xl leading-loose font-semibold text-gray-100 lg:text-left lg:text-5xl lg:leading-16">
                {t('hero.title_part1')}{' '}
                <span className="text-primary font-bold">{t('hero.title_highlight')}</span>.
              </h1>
              <h2 className="mt-5 text-gray-300 lg:mt-8 lg:text-lg">
                {t('hero.subtitle_part1')}{' '}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('hero.subtitle_link')}
                </a>{' '}
                {t('hero.subtitle_part2')}
              </h2>
              <div className="mt-10 flex flex-col gap-6 lg:flex-row">
                <Link href="/auth/signin" className="mx-auto lg:mx-0">
                  <Button className="flex w-[200px] items-center gap-2 rounded-full">
                    {t('hero.add_expense_button')} <ArrowRight size={15} />{' '}
                  </Button>
                </Link>
                <Link
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  className="mx-auto lg:mx-0"
                >
                  <Button
                    variant="outline"
                    className="flex w-[200px] items-center gap-2 rounded-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 96" className="size-4">
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
                        fill="#fff"
                      />
                    </svg>{' '}
                    {t('hero.star_github_button')}
                  </Button>
                </Link>
              </div>
              <div className="mt-40" />
            </div>
            <div className="mt-8 mb-20 flex justify-center lg:hidden">
              <MobileScreenShot />
            </div>
            <div className="flex flex-col gap-20 text-center lg:text-left">
              <p className="text-2xl">{t('features.title')}</p>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Users className="text-primary size-6" />
                    <p className="text-lg font-medium">{t('features.groups_and_friends.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.groups_and_friends.description')}
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Banknote className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.multiple_currencies.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.multiple_currencies.description')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Split className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.unequal_split.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.unequal_split.description')}
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Globe className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.pwa_support.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.pwa_support.description')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <FileUp className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.upload_receipts.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.upload_receipts.description')}
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <GitFork className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.open_source.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.open_source.description')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Import className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.import_splitwise.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.import_splitwise.description')}
                  </p>
                </div>
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Bell className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">{t('features.push_notifications.title')}</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    {t('features.push_notifications.description')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-24 mb-20 flex flex-col gap-8 text-center lg:text-left">
              <a
                href="https://www.producthunt.com/posts/splitpro?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-splitpro"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=444717&theme=light"
                  alt="Splitpro - Free&#0032;drop&#0032;in&#0032;replacement&#0032;&#0032;to&#0032;Splitwise&#0058;&#0032;Fully&#0032;Open&#0032;source | Product Hunt"
                  className="mx-auto h-[47px] w-[200px] lg:mx-0"
                  width="200"
                  height="47"
                />
              </a>
              <div>
                {t('footer.built_by')}{' '}
                <a
                  className="text-primary"
                  href="https://koushik.dev"
                  target="_blank"
                  rel="noreferrer"
                >
                  KM Koushik
                </a>
                ,{' '}
                <a
                  className="text-primary"
                  href="https://github.com/krokosik"
                  target="_blank"
                  rel="noreferrer"
                >
                  krokosik
                </a>
                {/* <p className="text-gray-400">
                  A product of <a className="underline underline-offset-2">ossapps.dev</a>
                </p> */}
              </div>
              <div className="flex justify-center gap-4 lg:justify-start">
                <a
                  className="text-primary"
                  href="https://twitter.com/KM_Koushik_"
                  target="_blank"
                  rel="noreferrer"
                >
                  Twitter
                </a>
                <a
                  className="text-primary"
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </div>
          <div className="sticky top-40 hidden shrink-0 lg:flex">
            <MobileScreenShot />
          </div>
        </div>
      </main>
    </>
  );
}

const MobileScreenShot = () => (
  <BackgroundGradient>
    <Image
      src="/hero.webp"
      className="bg-background rounded-[22px] border"
      width={300}
      height={550}
      alt="hero"
    />
  </BackgroundGradient>
);

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    isCloud: env.NEXTAUTH_URL.includes('splitpro.app'),
    ...(await customServerSideTranslations(context.locale, ['home', 'common'])),
  },
});
