// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'public/mockServiceWorker.js'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Architecture boundary: shared/ must never depend on features/.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/*/**/!(index)', '@/features/*/*/**'],
              message:
                'Import a feature through its public surface (feature pages via the router, or @/features/<name>/...) instead of reaching deep into another feature.',
            },
          ],
        },
      ],
    },
  },
  // Shared and mock layers may not import feature code at all.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/**', '**/features/**'],
              message:
                'shared/ is the lowest layer and must not depend on features/. Move the shared piece down, or keep the logic inside the feature.',
            },
          ],
        },
      ],
    },
  },
  // Node-side config files.
  {
    files: ['*.config.{ts,js}', 'e2e/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
