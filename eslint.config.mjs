import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'jest.config.js'],
  },
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
    rules: {
      'no-console': 'off',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
    },
  },
);
