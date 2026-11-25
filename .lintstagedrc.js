const config = {
  // Format all supported file types with prettier
  '*': ['prettier --write -u'],

  // Run oxlint on JavaScript/TypeScript files
  '*.{js,jsx,ts,tsx}': ['oxlint --fix'],

  // Format prisma.schema files
  '*.prisma': ['pnpm prisma format'],

  // Type check TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',
};

export default config;
