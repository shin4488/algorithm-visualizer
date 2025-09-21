# 開発用（マルチプラットフォーム対応の公式 Node イメージ）
FROM node:20-bullseye

# Dev Containers / Cursor が期待するツールを入れておく
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git curl ca-certificates openssh-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# アプリ本体（src など）はボリュームでマウントするので COPY しない
# CMD は compose 側で指定（--host 0.0.0.0 を渡すため）
