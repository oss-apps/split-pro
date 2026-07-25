import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import i18nConfig from './next-i18next.config.js';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
const jiti = createJiti(fileURLToPath(import.meta.url));
import withSerwistInit from '@serwist/next';

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await jiti.import('./src/env');

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.DOCKER_OUTPUT ? 'standalone' : undefined,
  transpilePackages: ['@t3-oss/env-nextjs', '@t3-oss/env-core'],
  // The Prisma driver adapter pulls in `pg`, which uses Node built-ins (net/crypto/tls).
  // Keep it (and Prisma) external so webpack requires them at runtime instead of bundling.
  serverExternalPackages: ['pg', '@prisma/adapter-pg', '@prisma/client', '@prisma/engines'],
  webpack: (config, { nextRuntime }) => {
    // `instrumentation.ts` is also compiled for the edge runtime; its DB work is guarded to
    // NEXT_RUNTIME==='nodejs' and never runs on edge, but webpack still tries to bundle `pg`
    // (and its Node-built-in-using deps) there. Externalize `pg` in the edge build so its whole
    // Subtree is left as an unbundled require — the edge code path never loads it, so it's inert.
    if (nextRuntime === 'edge') {
      config.externals = [...(config.externals ?? []), 'pg', 'pg-native'];
    }
    return config;
  },
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
