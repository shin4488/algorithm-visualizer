# Algorithm Visualizer

バブルソートとクイックソートを並列で比較しながらアニメーション表示する学習用サイトです。React と TypeScript で構成され、今後別のアルゴリズムを追加しやすい構造になっています。

## 利用技術
- React 18
- TypeScript 5
- Yarn (パッケージ管理)
- ESLint / Prettier

## ディレクトリ構成
```
src/
  App.tsx             … 画面全体の UI
  algorithms/
    bubbleSort.ts     … バブルソートのステップ生成
    quickSort.ts      … クイックソートのステップ生成
  array.ts            … 乱数配列の生成
  speed.ts            … アニメ速度計算
  steps.ts            … 可視化ステップ型定義
  main.tsx            … エントリーポイント
  styles.css          … スタイル
  types.d.ts          … グローバル型定義
tests/
  run-tests.ts        … 仕様に基づくテスト
  helpers.ts          … テスト用ユーティリティ
scripts/
  dev.js              … 開発サーバー
  copy-static.js      … HTML/CSS コピー
public/
  (tsc の出力先)
```

## 開発手順
1. 依存関係のインストール
   ```bash
   yarn install
   ```
2. ビルド
   ```bash
   yarn build
   ```
3. テスト実行
   ```bash
   yarn test
   ```
4. コード整形・静的解析
   ```bash
   yarn lint
   ```

## 起動方法
開発サーバーを起動するには次を実行します。

```bash
yarn dev
```

ブラウザで http://localhost:3000 を開きます。

ビルド済みの静的ファイルは `public/` 以下に生成されるため、任意の静的サーバーで公開できます。

## 備考
- TypeScript の出力は `public/` 以下に生成されます。
- React と ReactDOM は `node_modules/` から UMD 版を読み込みます。
