import {
  ArrowRight,
  Banknote,
  Bell,
  FileUp,
  GitFork,
  Github,
  Globe,
  Import,
  Split,
  Users,
} from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from 'next-i18next.config.js';

import { BackgroundGradient } from '~/components/ui/background-gradient';
import { Button } from '~/components/ui/button';
import { LanguageSelector } from '~/components/ui/language-selector';

export default function Home() {
  const { t, i18n, ready } = useTranslation('index');


  return (
    <>
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
              <h1 className="lg:leading-16 max-w-3xl text-center text-2xl font-semibold leading-loose text-gray-100 lg:text-left lg:text-5xl">
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
                    <Github size={15} /> {t('hero.star_github_button')}
                  </Button>
                </Link>
              </div>
              <div className="mt-40" />
            </div>
            <div className="mb-20 mt-8 flex justify-center lg:hidden">
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

            <div className="mb-20 mt-24 flex flex-col gap-8 text-center lg:text-left">
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
                  {t('footer.author_name')}
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
                  {t('footer.twitter')}
                </a>
                <a
                  className="text-primary"
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('footer.github')}
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

const MobileScreenShot = () => {
  return (
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
};

export const getStaticProps = async ({ locale }: { locale: string }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['index', 'common'], i18nConfig)),
    },
  };
};
