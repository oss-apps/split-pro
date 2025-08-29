import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import i18nConfig from './next-i18next.config.js';

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
  trailingSlash: true,
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

// @ts-expect-error We don't need to type this function
const nextConfigFunction = async (phase) => {
  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withPWA = (await import('@ducanh2912/next-pwa')).default({
      dest: 'public',
      disable: 'development' === process.env.NODE_ENV,
    });
    return withPWA(nextConfig);
  }
  return nextConfig;
};

export default nextConfigFunction;
