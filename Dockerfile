FROM node:18-alpine

# 作業ディレクトリ
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production

# アプリケーションのソースをコピー
COPY . .

# ポート設定（Cloud Runは環境変数PORTを使用）
ENV PORT=8080
EXPOSE 8080

# アプリケーション起動
CMD ["npm", "start"]
