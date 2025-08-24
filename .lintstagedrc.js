const config = {
  // Format all supported file types with prettier
  '*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml,html}': ['prettier --write'],

  // Run oxlint on JavaScript/TypeScript files
  '*.{js,jsx,ts,tsx}': ['oxlint --type-aware --fix'],

  // Type check TypeScript files (optional - can be slow)
  // '*.{ts,tsx}': () => 'tsc --noEmit',
};

export default config;
