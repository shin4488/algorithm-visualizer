# algorithm-visualizer

develop the site to visualize the algorithm.

## 開発用スクリプト

プロジェクトルートで以下のコマンドを実行することで、静的解析を行えます。

- `yarn lint` / `npm run lint` – ESLint によるコードチェック
- `yarn format:check` / `npm run format:check` – Prettier によるフォーマットチェック

ESLint では `console.log` と `debugger` を警告として検出し、本番環境（`NODE_ENV=production`）では `console.log` をエラーとして扱います。

初回実行時は必要な ESLint / Prettier 関連パッケージを `npx` で取得するため、インターネット接続が必要です。
