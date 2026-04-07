// @ts-check
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

/** @type {import('typescript-eslint').ConfigArray} */
export default tseslint.config(
  // Global ignores — applied before any other config
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/*.config.{js,ts}'],
  },

  // TypeScript source files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        // Avoids "parserOptions.project" error for non-project files
        EXPERIMENTAL_useProjectService: true,
      },
    },
    rules: {
      // Disable base rule — TypeScript version handles this properly
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      'no-console': 'warn',

      // No escape hatch — if you need any, use unknown + type guard
      '@typescript-eslint/no-explicit-any': 'error',

      // Off — too verbose for React components and short lambdas
      '@typescript-eslint/explicit-function-return-type': 'off',

      // Floating promises are silent bugs — always handle them
      '@typescript-eslint/no-floating-promises': 'error',

      // Consistent import ordering across the whole codebase
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
          'newlines-between': 'always',
        },
      ],
    },
  },
)
