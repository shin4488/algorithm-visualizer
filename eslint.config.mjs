import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
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

  // 型情報ありの推奨セット（TS/TSXにだけスコープする）
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // Prettier 競合OFF
  eslintConfigPrettier,
];
