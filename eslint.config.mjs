import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  { ignores: ['node_modules', 'public', 'coverage', '.parcel-cache'] },

  // 型情報を使うルールのため、typescript-eslint のパーサーに tsconfig を渡す
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
      parserOptions: {
        // tsconfig.json は src だけを含むため、設定ファイルも含む ESLint 用の tsconfig を使う
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    rules: {
      'no-console': 'warn',
      'dot-notation': 'warn',
      'prefer-const': 'error',
      'no-unreachable-loop': 'error',
      'no-var': 'error',
      // undefined になり得る (obj?.foo)() のような使い方を禁止する
      'no-unsafe-optional-chaining': 'error',
    },
  },

  // 型情報ありの推奨セット（TS/TSXにだけスコープする）
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // Prettier と重なる整形のルールを無効にするため、最後に置く
  eslintConfigPrettier,
);
