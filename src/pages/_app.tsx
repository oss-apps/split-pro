import { type Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { type AppType } from 'next/app';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Poppins } from 'next/font/google';
import { ThemeProvider } from '~/components/theme-provider';
import { api } from '~/utils/api';
import clsx from 'clsx';
import Head from 'next/head';
import { Toaster } from 'sonner';
import NProgress from 'nprogress';
import Router from 'next/router';

import '~/styles/globals.css';

NProgress.configure({ showSpinner: false });

Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeStart', () => {
  NProgress.start();
});
Router.events.on('routeChangeError', () => () => NProgress.done());

const poppins = Poppins({ weight: ['200', '300', '400', '500', '600', '700'], subsets: ['latin'] });

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <main className={clsx(poppins.className, 'h-full')}>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="application-name" content="SplitPro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="SplitPro" />
        <meta name="description" content="Best PWA App in the world" />
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
        <meta name="twitter:url" content="https://yourdomain.com" />
        <meta name="twitter:title" content="SplitPro" />
        <meta name="twitter:description" content="Split Expenses with your friends for free" />
        <meta
          name="twitter:image"
          content="https://yourdomain.com/icons/android-chrome-192x192.png"
        />
        <meta name="twitter:creator" content="@DavidWShadow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SplitPro" />
        <meta property="og:description" content="SplitPro" />
        <meta property="og:site_name" content="SplitPro" />
        <meta property="og:url" content="https://splitpro.app" />
        <meta property="og:image" content="https://yourdomain.com/icons/apple-touch-icon.png" />
      </Head>
      <SessionProvider session={session}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <Toaster />
          <Component {...pageProps} />
        </ThemeProvider>
      </SessionProvider>
    </main>
  );
};

export default api.withTRPC(MyApp);
