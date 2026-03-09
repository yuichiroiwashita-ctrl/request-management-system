# 🚨 GenSpark Space 設定変更手順

## 現在の状況

✅ 正しく検出されています！

スクリーンショットの「サーバー未起動」メッセージは、
Node.jsサーバーが起動していないことを正しく検出しています。

## 必要な作業

GenSpark Spaceの管理画面で、プロジェクト設定を変更してください。

---

## 📋 手順

### ステップ1: GenSpark Spaceのダッシュボードを開く

1. GenSpark Spaceにログイン
2. プロジェクト一覧から `request-management-system` を選択
3. 設定（Settings）またはデプロイ設定を開く

### ステップ2: プロジェクトタイプを変更

以下の設定項目を探してください：

#### A. Project Type / プロジェクトタイプ
```
現在: Static Site / Static Hosting / Frontend
変更: Node.js / Backend / Node.js Application
```

#### B. Build Settings / ビルド設定
```
Build Command: npm install
または
Build Command: npm ci
```

#### C. Start/Run Command / 起動コマンド
```
Start Command: npm start
または
Start Command: node server.js
```

#### D. Port / ポート設定
```
Port: 8080
または
Port: auto
または
Port: $PORT
```

### ステップ3: 環境変数を設定

Environment Variables セクションで以下を追加：

```
NODE_ENV=production
PORT=8080
SESSION_SECRET=your-random-secret-key-change-this
TALKNOTE_CLIENT_ID=d2f29c73bb4495431543e2af5edcce52502a3075
TALKNOTE_CLIENT_SECRET=ae327074d9a86851be92bad956eedd8bd64958a2
TALKNOTE_REDIRECT_URI=https://sbbosryj.gensparkspace.com/api/callback
```

### ステップ4: 保存して再デプロイ

1. 設定を保存
2. "Deploy" または "Redeploy" ボタンをクリック
3. ビルドログを確認

---

## ✅ 成功の確認

### 再デプロイ後、ログに以下が表示されるはず：

```
🚀 Server running
   URL: http://localhost:8080
   Environment: production
============================================================

📄 File Check:
   ROOT index.html: ✅ Found
   PUBLIC index.html: ✅ Found
   dashboard.html: ✅ Found
   styles.css: ✅ Found
   dashboard.js: ✅ Found

✨ Minimal design version with deadline extension feature
```

### エンドポイントをテスト

```
https://sbbosryj.gensparkspace.com/health
```

**期待される結果**:
```json
{
  "status": "ok",
  "timestamp": "2024-03-09T...",
  "uptime": 123.45,
  "environment": "production",
  "port": 8080
}
```

**現在の結果**:
```json
{"detail": "Not Found"}
```

---

## 🔍 設定画面が見つからない場合

### オプション1: サポートチャットで依頼

GenSpark Spaceのサポートチャットで以下をコピー＆ペースト：

```
プロジェクト名: request-management-system
URL: https://sbbosryj.gensparkspace.com

このプロジェクトをNode.jsアプリケーションとして動作させたいです。
現在は静的サイトモードで動作しており、サーバーが起動していません。

必要な設定:
- Project Type: Node.js Application
- Build Command: npm install
- Start Command: npm start
- Port: 8080

設定方法を教えていただけますか？
```

### オプション2: ドキュメントを確認

GenSpark Spaceのドキュメントで以下を検索：
- "Node.js deployment"
- "Backend application"
- "Change project type"
- "Express application"

### オプション3: CLI ツールを使用

GenSpark SpaceにCLIツールがある場合：

```bash
# インストール
npm install -g @genspark/cli

# ログイン
genspark login

# プロジェクト設定
genspark config set type nodejs
genspark config set start "npm start"
genspark config set port 8080

# デプロイ
genspark deploy
```

---

## 📞 さらにサポートが必要な場合

### 提供すべき情報

1. **スクリーンショット**
   - GenSpark Spaceのプロジェクト設定画面
   - デプロイログの全体

2. **確認事項**
   - GenSpark SpaceはNode.jsアプリをサポートしていますか？
   - サーバーサイドアプリケーションをデプロイできますか？
   - Express.jsアプリケーションの実績はありますか？

3. **代替案**
   もしGenSpark SpaceがNode.jsをサポートしていない場合：
   - Heroku（無料）
   - Railway（無料）
   - Render（無料）
   - Vercel（無料）
   
   これらのサービスに移行することを推奨します。

---

## 🎯 重要なポイント

### ❌ 静的サイトモードでは動作しない理由

このアプリケーションは以下の機能が必要です：

1. **サーバーサイド処理**
   - OAuth認証フロー
   - セッション管理
   - データベース操作

2. **APIエンドポイント**
   - `/api/user` - ユーザー情報取得
   - `/api/requests` - リクエスト管理
   - `/api/auth/login` - 認証処理

3. **動的なルーティング**
   - `/app` → Express がルーティング
   - `/dashboard` → 認証チェック後に配信

これらはすべて **Node.jsサーバーが起動している** 必要があります。

### ✅ 必須条件

- Node.jsランタイムが動作
- `npm start` コマンドが実行される
- ポート8080でサーバーがリッスン
- HTTPリクエストがExpressサーバーに到達

---

**現在のステータス**: 静的ファイルモードで動作中（サーバー未起動）  
**必要なアクション**: GenSpark Spaceの設定を「Node.js Application」に変更  
**優先度**: 🔴 HIGH - この設定なしではアプリは動作しません

---

設定変更後、必ず以下で確認してください：
```
https://sbbosryj.gensparkspace.com/health
```

`{"status":"ok"}` が返ってくれば成功です！🎉
