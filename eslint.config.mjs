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
  {
    rules: {
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: { attributes: false },
        },
      ],
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
    },
  },
);
