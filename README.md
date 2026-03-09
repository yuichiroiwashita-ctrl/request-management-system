# Request - 社内リクエスト管理システム

**バージョン 2.0** - ミニマルデザイン版（期日延長機能付き）

社内のリクエストをTalknote連携で管理し、期日遵守を評価できるWebアプリケーションです。

---

## ✨ 新機能（v2.0）

### 🎨 デザイン全面刷新
- **ミニマリスト哲学**: Less is More。必要最低限の要素のみ。
- **モノクローム基調**: 白・黒・グレー + アクセントカラー（青）のみ
- **余白を活かしたレイアウト**: 情報の整理と視認性の向上
- **フラットデザイン**: シャドウとグラデーションを排除した洗練されたUI

### ⏱️ 期日延長機能
- **期日延長申請**: 受信者が期日前に延長を申請できる
- **延長承認・却下**: 送信者が延長申請に回答
- **履歴管理**: 延長申請の履歴を表示
- **Talknote自動通知**: 申請・承認・却下時に自動通知

---

## 🚀 主な機能

### 1. 認証システム
- Talknote OAuth 2.0によるシングルサインオン
- セッション管理による認証状態の維持

### 2. リクエスト管理
- **作成**: タイトル、内容、期日、宛先（Talknoteユーザー）、通知先（Talknoteグループ）を指定
- **回答**: Yes / No / 条件付きYes の3パターン
- **完了報告**: テキスト + ファイルアップロード（最大10MB）
- **期日管理**: 期日内完了 / 期日超過を自動判定

### 3. 期日延長システム（NEW!）
- **申請条件**: 承認済みリクエスト、期日前、延長申請中でない
- **申請内容**: 新しい希望期日、延長理由（必須）
- **承認フロー**: 送信者が承認/却下を判断
- **自動更新**: 承認時に期日が自動更新
- **ステータス表示**: 延長申請中・延長承認・延長却下のバッジ表示

### 4. Talknote連携
- ユーザー一覧取得（宛先選択）
- グループ一覧取得（通知先選択）
- リクエスト作成時の自動投稿
- 回答時の自動投稿
- 完了報告時の自動投稿
- 期日延長申請・回答時の自動投稿

### 5. 統計情報
- 総リクエスト数
- 承認待ち件数
- 期日内完了件数
- 期日超過件数
- 延長申請中件数

---

## 📋 必要要件

- **Node.js**: v14.0.0 以上
- **npm**: v6.0.0 以上
- **Talknote アカウント**: 管理者権限で外部公開API有効化済み

---

## 🛠️ セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd request-management-system
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` ファイルを開いて以下を設定：

```env
# Talknote API設定（すでに入力済み）
TALKNOTE_CLIENT_ID=d2f29c73bb4495431543e2af5edcce52502a3075
TALKNOTE_CLIENT_SECRET=ae327074d9a86851be92bad956eedd8bd64958a2
TALKNOTE_REDIRECT_URI=https://insp.co.jp/api/callback

# サーバー設定
PORT=3000
NODE_ENV=development

# セッション秘密鍵（本番環境では必ず変更！）
SESSION_SECRET=your-random-secret-key-here
```

**⚠️ 重要**: 本番環境では `SESSION_SECRET` を強力なランダム文字列に変更してください。

### 4. Talknote設定

Talknote管理画面で以下を確認・設定：

1. **ネットワーク管理** > **外部公開API** を有効化
2. リダイレクトURLを設定：
   - **開発環境**: `http://localhost:3000/api/callback`
   - **本番環境**: `https://insp.co.jp/api/callback`

### 5. サーバー起動

```bash
# 開発モード（自動リロード）
npm run dev

# 本番モード
npm start
```

アプリケーションは `http://localhost:3000` で起動します。

---

## 📁 プロジェクト構成

```
request-management-system/
├── server.js              # Expressサーバー + APIエンドポイント
├── database.js            # SQLiteデータベース管理
├── talknote-api.js        # Talknote API連携クラス
├── package.json           # 依存パッケージ
├── .env.example           # 環境変数サンプル
├── .gitignore             # Git除外設定
├── README.md              # 詳細ドキュメント
├── QUICKSTART.md          # クイックスタート
├── public/
│   ├── index.html        # ログイン画面（ミニマルデザイン）
│   ├── dashboard.html    # ダッシュボードUI（ミニマルデザイン）
│   ├── dashboard.js      # フロントエンドロジック（期日延長機能付き）
│   └── styles.css        # ミニマルデザインCSS
├── uploads/               # ファイルアップロード保存先
└── requests.db            # SQLiteデータベース（自動生成）
```

---

## 🗄️ データベーススキーマ

### users テーブル
```sql
id TEXT PRIMARY KEY,
name TEXT NOT NULL,
email TEXT,
avatar_url TEXT,
access_token TEXT NOT NULL,
refresh_token TEXT,
created_at DATETIME,
updated_at DATETIME
```

### requests テーブル
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT NOT NULL,
content TEXT NOT NULL,
deadline DATETIME NOT NULL,
sender_id TEXT NOT NULL,
sender_name TEXT NOT NULL,
recipient_id TEXT NOT NULL,
recipient_name TEXT NOT NULL,
status TEXT DEFAULT 'pending',
response_type TEXT,
response_condition TEXT,
completion_report TEXT,
completion_file_path TEXT,
completed_at DATETIME,
deadline_met BOOLEAN,
talknote_group_id TEXT,
talknote_group_name TEXT,
extension_status TEXT DEFAULT NULL,  -- NEW!
created_at DATETIME,
updated_at DATETIME
```

### extension_requests テーブル（NEW!）
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
request_id INTEGER NOT NULL,
requester_id TEXT NOT NULL,
new_deadline DATETIME NOT NULL,
reason TEXT NOT NULL,
status TEXT DEFAULT 'pending',
responded_at DATETIME,
created_at DATETIME
```

---

## 🌐 APIエンドポイント

### 認証
- `GET /api/auth/login` - Talknoteログイン開始
- `GET /api/callback` - OAuth コールバック
- `GET /api/auth/logout` - ログアウト
- `GET /api/user` - 現在のユーザー情報取得

### Talknote連携
- `GET /api/talknote/users` - ユーザー一覧取得
- `GET /api/talknote/groups` - グループ一覧取得

### リクエスト管理
- `GET /api/requests` - リクエスト一覧取得
- `GET /api/requests/:id` - リクエスト詳細取得
- `POST /api/requests` - リクエスト作成
- `PUT /api/requests/:id/respond` - リクエストに回答
- `POST /api/requests/:id/complete` - 完了報告提出

### 期日延長（NEW!）
- `POST /api/requests/:id/extension` - 期日延長申請
- `GET /api/requests/:id/extensions` - 延長申請履歴取得
- `PUT /api/requests/:id/extension/:extensionId` - 延長申請に回答

### 統計
- `GET /api/stats` - 統計情報取得

---

## 🎯 使用方法

### 1. ログイン
1. `http://localhost:3000` にアクセス
2. 「Talknoteでログイン」ボタンをクリック
3. Talknote認証画面でログイン

### 2. リクエスト作成
1. 「新規リクエスト作成」ボタンをクリック
2. タイトル、内容、期日を入力
3. 宛先（Talknoteユーザー）を選択
4. 通知先（Talknoteグループ）を選択
5. 「作成」ボタンをクリック

### 3. リクエストに回答
1. 受信したリクエストカードをクリック
2. Yes / No / 条件付きYes を選択
3. 「回答する」ボタンをクリック

### 4. 期日延長申請（NEW!）
1. 承認済みリクエストカードの「期日延長を申請」ボタンをクリック
2. 新しい希望期日を選択
3. 延長理由を入力
4. 「申請する」ボタンをクリック

### 5. 期日延長への回答（NEW!）
1. 延長申請中のリクエストカードをクリック
2. 「期日延長申請への回答」セクションで内容を確認
3. 「承認する」または「却下する」ボタンをクリック

### 6. 完了報告
1. 承認済みリクエストカードをクリック
2. 報告内容を入力
3. 必要に応じてファイルをアップロード
4. 「報告を提出」ボタンをクリック

---

## 🔐 セキュリティ

- セッションにはHTTP-Only Cookieを使用
- 本番環境では必ずHTTPS通信を使用してください
- `SESSION_SECRET` は必ず変更してください
- ファイルアップロードサイズは10MBに制限

---

## 🚀 本番環境へのデプロイ

### Nginxリバースプロキシ設定例

```nginx
server {
    listen 80;
    server_name insp.co.jp;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 環境変数設定（本番環境）

```bash
export NODE_ENV=production
export PORT=3000
export SESSION_SECRET="strong-random-secret-key"
export TALKNOTE_REDIRECT_URI="https://insp.co.jp/api/callback"
```

### PM2による永続化

```bash
npm install -g pm2
pm2 start server.js --name request-app
pm2 save
pm2 startup
```

---

## 🐛 トラブルシューティング

### データベースエラー
```bash
# データベースファイルを削除して再初期化
rm requests.db
npm start
```

### OAuth認証エラー
- Talknote管理画面でリダイレクトURLが正しく設定されているか確認
- `.env` ファイルのクライアントID・シークレットが正しいか確認

### ファイルアップロードエラー
- `uploads/` ディレクトリが存在するか確認
- ファイルサイズが10MB以下か確認

---

## 📝 今後の開発候補

- [ ] リクエストの編集・削除機能
- [ ] 検索・フィルター強化（期日・ステータス・キーワード）
- [ ] メール通知・リマインダー機能
- [ ] レポート・統計機能の拡充（期日遵守率グラフなど）
- [ ] レスポンシブデザインのさらなる最適化
- [ ] 権限管理（管理者機能、部署別アクセス制御）
- [ ] リクエストのテンプレート機能
- [ ] コメント機能（リクエストへのスレッド型コメント）

---

## 📄 ライセンス

MIT License

---

## 👥 開発者

作成: AI Agent (2024)

---

**デザイン哲学**: 
> "Less is More" - 必要最低限の要素で最大の効果を。
> 余白は贅沢であり、情報を際立たせる。
> モノクロームの中に、アクセントカラーが生きる。
