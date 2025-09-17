import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  { ignores: ['node_modules', 'public', 'coverage', '.parcel-cache'] },

  // まず TSParser に tsconfig を認識させる
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
      parserOptions: {
        // 単一プロジェクト想定。複数なら配列で列挙
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      'no-console': 'warn',
      'no-extra-semi': 'warn',
      'dot-notation': 'warn',
      'prefer-const': 'error',
      'no-unreachable-loop': 'error',
      'no-var': 'error',
      // if 1行も波括弧必須
      curly: ['error', 'all'],
      // (obj?.foo)?.() を要求
      'no-unsafe-optional-chaining': 'error',
    },
  },

  // 型情報ありの推奨セット（TS/TSXにだけスコープする）
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // Prettier 競合OFF
  eslintConfigPrettier,
);
