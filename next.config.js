/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import pwa from 'next-pwa';
// @ts-ignore
import nextra from 'nextra';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const withPwa = pwa({
  dest: 'public',
  // disable: process.env.NODE_ENV === 'development',
});

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  output: process.env.DOCKER_OUTPUT ? 'standalone' : undefined,
  experimental: {
    instrumentationHook: true,
  },
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
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

const withNextra = nextra({
  theme: 'nextra-theme-blog',
  themeConfig: './theme.config.jsx',
});

// @ts-ignore
export default withNextra(withPwa(config));
