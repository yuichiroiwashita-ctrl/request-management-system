# Request Management System - README

## 📋 プロジェクト概要

社内リクエスト管理システム - Talknote連携版

- **本番URL**: https://request.insp.co.jp/app
- **Railway URL**: https://request-management-system-production.up.railway.app/

## 🚀 最新機能（2026-03-10）

### ✅ 実装済み

1. **簡易ログインシステム**
   - ユーザー選択でログイン（OAuth不要）
   - Google スプレッドシート連携

2. **Google Sheets 連携**
   - ユーザー情報の自動同期
   - グループ一覧の自動同期
   - Apps Script による1時間ごとの更新

3. **アクセストークン管理機能** 🆕
   - URL: `/admin/tokens`
   - ログイン後にアクセストークンを表示
   - Google Apps Script 用のトークン取得が簡単に
   - コピー＆ダウンロード機能付き

## 🔑 アクセストークンの取得方法

### 方法1: Railway アプリ経由（推奨）

1. https://request.insp.co.jp/app にアクセス
2. ユーザー選択画面からログイン（または Talknote OAuth でログイン）
3. ダッシュボード右上の **🔑 トークン管理** をクリック
4. アクセストークンが表示される
5. **📋 コピー** ボタンでクリップボードにコピー
6. Google Apps Script の `setAccessTokenManually()` に貼り付け

### 方法2: API 経由

```bash
# ログイン後のセッションで
curl https://request.insp.co.jp/api/admin/tokens \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## 📊 Google Sheets 設定

### スプレッドシート

- **ID**: `11kaoNOJh5bUVnfPhgqh4zMdGiBpE08sOck61ZK5nyJQ`
- **URL**: https://docs.google.com/spreadsheets/d/11kaoNOJh5bUVnfPhgqh4zMdGiBpE08sOck61ZK5nyJQ/
- **シート構成**:
  - ユーザー情報（ID, 名前, メールアドレス, 部署, Talknote User ID, 最終更新日時）
  - グループ一覧（Group ID, グループ名, 説明, メンバー数, 最終更新日時）

### Apps Script セットアップ

1. スプレッドシート → **拡張機能 → Apps Script**
2. `google-apps-script/sync-talknote-oauth.js` のコードを貼り付け
3. `setAccessTokenManually()` 関数にアクセストークンを設定
4. `runNow()` でテスト実行
5. `setupTrigger()` で自動更新を有効化

## 🌐 Talknote API 設定

- **アプリケーション名**: tokenote-app
- **開発者名**: iwaCta
- **リダイレクトURL**: https://insp.co.jp/api/
- **クライアントID**: d2f29c73bb4495431543e2af5edcce52502a3075
- **クライアントシークレット**: ae327074d9a86851be92bad956eedd8bd64958a2

## 🛠️ 環境変数（Railway）

```bash
NODE_ENV=production
SESSION_SECRET=your-random-secret-key-12345
TALKNOTE_CLIENT_ID=d2f29c73bb4495431543e2af5edcce52502a3075
TALKNOTE_CLIENT_SECRET=ae327074d9a86851be92bad956eedd8bd64958a2
TALKNOTE_REDIRECT_URI=https://insp.co.jp/api/
APP_URL=https://request.insp.co.jp
GOOGLE_SPREADSHEET_ID=11kaoNOJh5bUVnfPhgqh4zMdGiBpE08sOck61ZK5nyJQ
```

## 📂 主要ファイル

```
request-management-system/
├── server.js                 # メインサーバー
├── database.js              # SQLite データベース
├── talknote-api.js          # Talknote API クライアント
├── google-sheets-service.js # Google Sheets 連携
├── public/
│   ├── dashboard.html       # ダッシュボード
│   ├── admin-token.html     # トークン管理画面 🆕
│   ├── styles.css           # スタイルシート
│   └── dashboard.js         # フロントエンドJS
├── google-apps-script/
│   └── sync-talknote-oauth.js # Apps Script コード
└── package.json
```

## 🔄 デプロイ手順

### GitHub Desktop 経由

1. 変更をコミット
2. **Push origin** で GitHub にプッシュ
3. Railway が自動デプロイ（約1-2分）
4. https://request.insp.co.jp/ で動作確認

### Railway CLI 経由

```bash
railway up
```

## 📝 次の実装予定

### Phase 5: リクエスト作成機能

- [ ] 宛先選択（スプレッドシートから）
- [ ] 投稿場所選択（グループ一覧から）
- [ ] 件名・内容・期日入力
- [ ] Talknote への自動投稿

### Phase 6: リクエスト一覧画面

- [ ] 受信リクエスト一覧
- [ ] 送信リクエスト一覧
- [ ] ステータス管理（未着手/進行中/完了）
- [ ] 期日表示とアラート

### Phase 7: 完了報告機能

- [ ] 成果物アップロード
- [ ] コメント入力
- [ ] Talknote スレッドへの投稿
- [ ] ステータス自動更新

## 🐛 トラブルシューティング

### アクセストークンが表示されない

1. ログインしているか確認
2. `/api/user` で認証状態を確認
3. セッションをクリア（ログアウト→再ログイン）

### Apps Script でエラー

1. アクセストークンが正しいか確認
2. `checkStatus()` で設定状態を確認
3. `testConnection()` で API 接続テスト

### データが同期されない

1. Apps Script のトリガーが設定されているか確認
2. 実行ログでエラーを確認
3. 手動で `runNow()` を実行してテスト

## 📞 サポート

問題が発生した場合:

1. Railway のデプロイログを確認
2. ブラウザのコンソール（F12）でエラーを確認
3. `/admin/tokens` でトークン状態を確認

## 📄 ライセンス

内部利用限定

---

**最終更新**: 2026-03-10  
**バージョン**: 2.1.0
