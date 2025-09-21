# 開発用（マルチプラットフォーム対応の公式 Node イメージ）
FROM node:20-alpine

# 依存インストールに必要なビルドツール（必要に応じて最小限）
RUN apk add --no-cache git

WORKDIR /app

# 依存だけ先に入れてビルドキャッシュを活用
COPY package.json yarn.lock* ./
# yarn (corepack) は node:20 で標準有効
RUN yarn install --frozen-lockfile

# アプリ本体（src など）はボリュームでマウントするので COPY しない
# CMD は compose 側で指定（--host 0.0.0.0 を渡すため）
