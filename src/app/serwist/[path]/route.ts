import { createSerwistRoute } from '@serwist/turbopack';

// Next.js requires route configuration values to be statically analyzable.
export const dynamic = 'force-static';
export const dynamicParams = false;
export const revalidate = false;

export const { generateStaticParams, GET } = createSerwistRoute({
  swSrc: 'worker/index.ts',
  useNativeEsbuild: true,
});
