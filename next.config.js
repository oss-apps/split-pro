/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

/** @type {import("next").NextConfig} */

import pwa from 'next-pwa';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const withPwa = pwa({
  dest: 'public',
});

const config = {
  reactStrictMode: true,

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ['en'],
    defaultLocale: 'en',
  },
  transpilePackages: ['geist'],
  images: {
    remotePatterns: [
      {
        hostname: 'pub-0624a769b22d4450bc688b50eb3fbd4e.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPwa(config);
