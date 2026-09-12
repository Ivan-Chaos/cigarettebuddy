import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './apps/web/svelte.config.js';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
        svelteConfig,
      },
    },
  },
  {
    // The retro kit's link components take an `href` prop. A generic component
    // cannot know whether the URL it is handed is internal, so resolve() is the
    // caller's job -- and every call site in the app does it, where this rule
    // still checks them. Only the kit's own pass-through is exempt.
    files: ['apps/web/src/lib/components/retro/*.svelte'],
    rules: {
      'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true }],
    },
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/build/',
      '**/.svelte-kit/',
      'packages/db/src/migrations/',
      // Vendored by the shadcn-svelte CLI; regenerated on every `shadcn-svelte add`.
      'apps/web/src/lib/components/ui/',
    ],
  },
);
