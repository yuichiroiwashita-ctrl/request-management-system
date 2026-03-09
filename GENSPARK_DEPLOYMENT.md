# GenSpark Space デプロイガイド

## 🚨 重要な問題と解決策

### 問題: `{"detail":"Not Found"}` エラー

**原因**: GenSpark Spaceが静的ファイルホスティングモードで動作し、Node.jsサーバーが起動していない。

### ✅ 解決策

このプロジェクトは **Node.js アプリケーション** として実行する必要があります。

## 📋 必要な設定

### 1. プロジェクトタイプ
- ❌ 静的サイト（Static Site）
- ✅ Node.js アプリケーション

### 2. ビルドコマンド
```bash
npm install
```

### 3. 起動コマンド
```bash
npm start
```
または
```bash
node server.js
```

### 4. ポート設定
- デフォルト: `8080`
- 環境変数 `PORT` から自動取得

### 5. 環境変数（必須）
```
NODE_ENV=production
SESSION_SECRET=your-secure-random-string-here
TALKNOTE_CLIENT_ID=d2f29c73bb4495431543e2af5edcce52502a3075
TALKNOTE_CLIENT_SECRET=ae327074d9a86851be92bad956eedd8bd64958a2
TALKNOTE_REDIRECT_URI=https://sbbosryj.gensparkspace.com/api/callback
```

## 🔍 デバッグ方法

### 1. サーバーが起動しているか確認
ログに以下が表示されるはずです：
```
🚀 Server running
   URL: http://localhost:8080
   Environment: production
============================================================
```

### 2. エンドポイントをテスト
```bash
# ヘルスチェック
curl https://sbbosryj.gensparkspace.com/health

# 期待される結果:
{"status":"ok","timestamp":"...","uptime":123.45}
```

### 3. ルートにアクセス
```
https://sbbosryj.gensparkspace.com/
```
→ テストページが表示されるはず

## 📁 ファイル構造

正しいファイル構造：
```
project/
├── server.js          ← メインサーバー（必須）
├── package.json       ← 依存関係定義（必須）
├── Procfile          ← Heroku形式の起動設定
├── vercel.json       ← Vercel形式の設定
├── app.yaml          ← GenSpark形式の設定
├── database.js
├── talknote-api.js
├── index.html        ← ルートのテストページ
├── debug.html        ← デバッグツール
├── public/           ← アプリの実体
│   ├── index.html
│   ├── dashboard.html
│   ├── styles.css
│   └── dashboard.js
└── uploads/          ← ファイルアップロード先
```

## 🛠️ トラブルシューティング

### A. 全てのパスで404が返される

**症状**: `/health`, `/app`, `/debug` など全てで `{"detail":"Not Found"}`

**原因**: Node.jsサーバーが起動していない

**解決策**:
1. GenSpark Spaceの設定を確認
2. プロジェクトタイプが「Node.js App」になっているか
3. 起動コマンドが `npm start` または `node server.js` か
4. ログを確認してサーバーの起動メッセージがあるか

### B. `/public/*` だけ動作する

**症状**: 
- ✅ `/public/index.html` → 200 OK
- ✅ `/public/styles.css` → 200 OK  
- ❌ `/health` → 404
- ❌ `/app` → 404

**原因**: 静的ファイルホスティングモードで動作している

**解決策**: プロジェクト設定を「Static Site」から「Node.js App」に変更

### C. ポート番号の問題

**症状**: サーバーは起動するがアクセスできない

**解決策**: 
- `PORT` 環境変数が設定されているか確認
- サーバーが `0.0.0.0` でリッスンしているか確認（現在の設定で対応済み）

## 🔧 GenSpark Space での推奨設定

### Project Settings
```yaml
Type: Node.js Application
Node Version: 18.x or higher
Build Command: npm install
Start Command: npm start
Port: 8080 (auto-detected from process.env.PORT)
```

### Environment Variables
```
NODE_ENV=production
PORT=8080  # 通常は自動設定
SESSION_SECRET=<ランダムな文字列>
TALKNOTE_CLIENT_ID=<Talknoteから取得>
TALKNOTE_CLIENT_SECRET=<Talknoteから取得>
TALKNOTE_REDIRECT_URI=<デプロイ後のURL>/api/callback
```

## ✅ 正常動作の確認

以下の全てが成功すれば正常に動作しています：

1. ✅ `https://your-app.gensparkspace.com/` → テストページが表示
2. ✅ `https://your-app.gensparkspace.com/health` → `{"status":"ok"}`
3. ✅ `https://your-app.gensparkspace.com/debug` → デバッグページが表示
4. ✅ `https://your-app.gensparkspace.com/app` → ログイン画面が表示
5. ✅ CSS・JSファイルが正しく読み込まれる

## 📞 サポート

問題が解決しない場合、以下の情報を提供してください：

1. GenSpark Spaceのプロジェクト設定スクリーンショット
2. サーバーログ（起動時のログ全体）
3. ブラウザのコンソールログ
4. テストした URL とレスポンス

---

**重要**: このアプリは Node.js サーバーとして動作する必要があります。静的サイトホスティングでは動作しません。
