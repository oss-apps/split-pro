// @ts-check

import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommendedTypeCheckedOnly,
  tseslint.configs.stylisticTypeCheckedOnly,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
