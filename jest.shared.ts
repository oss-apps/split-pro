import type { Config } from 'jest';
import nextJest from 'next/jest.js';

export const configureJest = async (config: Config): Promise<Config> => {
  const resolved = await nextJest({ dir: './' })({
    coverageProvider: 'v8',
    cacheDirectory: '<rootDir>/node_modules/.cache/jest',
    moduleNameMapper: { '^~/(.*)$': '<rootDir>/src/$1' },
    clearMocks: true,
    ...config,
  })();
  // Next/jest prepends its own node_modules exclusions. Replace them after resolution
  // So the real ESM-only serializer and ID generator work with pnpm's nested layout.
  const esmPackages = 'superjson|copy-anything|is-what|nanoid|@t3-oss[+/]env-(?:core|nextjs)';
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(\\.pnpm|${esmPackages})/)`,
      `/node_modules/\\.pnpm/(?!(?:${esmPackages})@)`,
    ],
  };
};
