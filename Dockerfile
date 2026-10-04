# 開発用（マルチプラットフォーム対応の公式 Node イメージ）
# Node のメジャーバージョンは、CI と本番（Render）のビルドが参照する .nvmrc と揃える
FROM node:24-bookworm

# Dev Containers / Cursor が期待するツールを入れておく
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git curl ca-certificates openssh-client tree \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# アプリ本体（src など）はボリュームでマウントするので COPY しない
# CMD は compose 側で指定（--host 0.0.0.0 を渡すため）
