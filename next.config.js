import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import i18nConfig from './next-i18next.config.js';
import withSerwistInit from '@serwist/next';

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_OUTPUT ? 'standalone' : undefined,
  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: i18nConfig.i18n,
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

const withSerwist = withSerwistInit({
  swSrc: 'worker/index.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // Incompatible with Turbopack https://github.com/serwist/serwist/issues/54
});

export default withSerwist(nextConfig);
