# Algorithm Visualizer

バブルソートとクイックソートを並列で比較しながらアニメーション表示する学習用サイトです。React と TypeScript で構成され、今後別のアルゴリズムを追加しやすい構造になっています。

## 利用技術
- React 18
- TypeScript 5
- Vite 5
- Yarn (パッケージ管理)
- ESLint / Prettier

## ディレクトリ構成
```
src/
  App.tsx             … 画面全体の UI
  index.html          … Vite エントリ
  algorithms/
    bubbleSort.ts     … バブルソートのステップ生成
    quickSort.ts      … クイックソートのステップ生成
  array.ts            … 乱数配列の生成
  speed.ts            … アニメ速度計算
  steps.ts            … 可視化ステップ型定義
  main.tsx            … エントリーポイント
  styles.css          … スタイル
  types.d.ts          … 型定義スタブ
tests/
  run-tests.ts        … 仕様に基づくテスト
  helpers.ts          … テスト用ユーティリティ
vite.config.ts        … Vite 設定
public/               … `yarn build` とテストの生成物
```

## 開発手順
1. 依存関係のインストール
   ```bash
   yarn install
   ```
2. 開発サーバー
   ```bash
   yarn dev
   ```
   ブラウザで http://localhost:5173 を開いて動作を確認します。
3. ビルド
   ```bash
   yarn build
   ```
   ビルド済みの静的ファイルは `public/` 以下に出力され、任意の静的サーバーで公開できます。
4. テスト実行
   ```bash
   yarn test
   ```
5. コード整形・静的解析
   ```bash
   yarn lint
   ```

## 備考
- テスト用のトランスパイル結果は `public/` 以下に生成されます。
