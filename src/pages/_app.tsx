import i18nConfig from '@/next-i18next.config.js';
import { clsx } from 'clsx';
import { type Session } from 'next-auth';
import { SessionProvider, useSession } from 'next-auth/react';
import { appWithTranslation, useTranslation } from 'next-i18next';
import { type AppType } from 'next/app';
import { Poppins } from 'next/font/google';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { LoadingSpinner } from '~/components/ui/spinner';
import { ThemeProvider } from 'next-themes';
import { CurrencyHelpersProvider } from '~/contexts/CurrencyHelpersContext';
import { useAddExpenseStore } from '~/store/addStore';
import { useAppStore } from '~/store/appStore';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { resolveSupportedLocale } from '~/utils/i18n/resolveLocale';

import 'react-easy-crop/react-easy-crop.css';
import '~/styles/globals.css';

const poppins = Poppins({ weight: ['200', '300', '400', '500', '600', '700'], subsets: ['latin'] });
const toastOptions = { duration: 1500 };

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const { t, ready } = useTranslation();

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingSpinner className="text-primary" />
      </div>
    );
  }

  // TODO: Migrate to APP router and get it from env var
  const baseUrl = global?.window?.location?.origin;

  return (
    <main className={clsx(poppins.className, 'h-full')}>
      <Head>
        <title>{t('meta.title')}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="application-name" content={t('meta.application_name')} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={t('meta.application_name')} />
        <meta name="description" content={t('meta.description')} />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#2B5797" />
        <meta name="msapplication-tap-highlight" content="no" />

        <meta name="theme-color" content="#030711" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="apple-touch-icon" href="/icons/ios/144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/ios/152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/ios/180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/ios/167.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
        <link rel="shortcut icon" href="/favicon.ico" />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={baseUrl} />
        <meta name="twitter:title" content={t('meta.application_name')} />
        <meta name="twitter:description" content={t('meta.description')} />
        <meta name="twitter:image" content={`${baseUrl}/og_banner.png`} />
        <meta name="twitter:creator" content="@KM_Koushik_" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.application_name')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:site_name" content={t('meta.application_name')} />
        <meta property="og:url" content={baseUrl} />
        <meta property="og:image" content={`${baseUrl}/og_banner.png`} />
      </Head>
      <SessionProvider session={session}>
        <CurrencyHelpersProvider>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <Toaster toastOptions={toastOptions} />
            {(Component as NextPageWithUser).auth ? (
              <Auth pageProps={pageProps} Page={Component as NextPageWithUser} />
            ) : (
              <Component {...pageProps} />
            )}{' '}
          </ThemeProvider>
        </CurrencyHelpersProvider>
      </SessionProvider>
    </main>
  );
};

const Auth: React.FC<{ Page: NextPageWithUser; pageProps: any }> = ({ Page, pageProps }) => {
  const { status, data, update } = useSession({ required: true });
  const { t } = useTranslation();
  const [showSpinner, setShowSpinner] = useState(false);
  const updateUser = api.user.updateUserDetail.useMutation();
  const router = useRouter();

  const { setCurrency } = useAddExpenseStore((s) => s.actions);
  const { setWebPushPublicKey } = useAppStore((s) => s.actions);

  const { data: webPushPublicKey } = api.user.getWebPushPublicKey.useQuery();

  useEffect(() => {
    setTimeout(() => {
      setShowSpinner(true);
    }, 300);
  }, []);

  useEffect(() => {
    if (webPushPublicKey) {
      setWebPushPublicKey(webPushPublicKey);
    }
  }, [webPushPublicKey, setWebPushPublicKey]);

  useEffect(() => {
    if ('authenticated' === status && data.user) {
      const currentLocale = resolveSupportedLocale(
        router.locale,
        i18nConfig.i18n.locales,
        i18nConfig.i18n.defaultLocale,
      );
      const preferredLanguage = data.user.preferredLanguage;
      const resolvedLanguage = preferredLanguage
        ? resolveSupportedLocale(
            preferredLanguage,
            i18nConfig.i18n.locales,
            i18nConfig.i18n.defaultLocale,
          )
        : currentLocale;

      if (preferredLanguage !== resolvedLanguage) {
        updateUser
          .mutateAsync({
            preferredLanguage: resolvedLanguage,
          })
          .then(() =>
            update({
              user: {
                ...data.user,
                preferredLanguage: resolvedLanguage,
              },
            }),
          )
          .catch((error) => {
            console.error(error);
            toast.error(t('errors.language_change_failed'));
          });
      } else if (resolvedLanguage !== router.locale) {
        router
          .push(router.asPath, router.asPath, { locale: resolvedLanguage, scroll: false })
          .catch(console.error);
      }
    }
  }, [status, data?.user, setCurrency, router, t, updateUser, update]);

  if ('loading' === status) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {showSpinner ? <LoadingSpinner className="text-primary" /> : null}
      </div>
    );
  }

  return <Page user={data.user} {...pageProps} />;
};

export default api.withTRPC(appWithTranslation(MyApp, i18nConfig));
