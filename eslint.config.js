import js from '@eslint/js';
import globals from 'globals';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  {
    ignores: ['node_modules/', 'public/', '.parcel-cache/'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-debugger': 'warn',
      'no-console': [isProduction ? 'error' : 'warn', { allow: ['warn', 'error', 'info'] }],
      'no-extra-semi': 'warn',
      'dot-notation': 'warn',
      'prefer-const': 'error',
      'no-unreachable-loop': 'error',
      'no-var': 'error',
      curly: 'error',
      'no-unsafe-optional-chaining': 'error',
    },
  },
  {
    files: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },
  {
    files: ['**/*.config.js', '**/*.config.cjs', '**/*.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
