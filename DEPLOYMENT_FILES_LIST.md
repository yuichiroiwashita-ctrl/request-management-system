# デプロイに必要なファイル一覧

以下のファイルを GitHub にアップロードしてください：

## 📁 必須ファイル

```
request-management-system/
├── server.js                 ✅ メインサーバーファイル
├── database.js               ✅ データベース設定
├── talknote-api.js          ✅ Talknote API 連携
├── package.json             ✅ 依存関係定義
├── .env.example             ✅ 環境変数サンプル
├── .gitignore               ✅ Git 除外設定
├── README.md                ✅ プロジェクト説明
├── QUICKSTART.md            ✅ クイックスタート
├── Procfile                 ✅ Railway/Heroku用
├── public/
│   ├── index.html           ✅ ログイン画面
│   ├── dashboard.html       ✅ ダッシュボード
│   ├── styles.css           ✅ スタイルシート
│   └── dashboard.js         ✅ フロントエンドJS
└── uploads/
    └── .gitkeep             ✅ 空フォルダ保持用
```

## ⚠️ アップロードしないファイル

以下は `.gitignore` に含まれているため、アップロードしません：

```
node_modules/          # npm パッケージ（自動生成）
.env                   # 本番環境変数（Railway で設定）
*.db                   # データベースファイル（Railway で自動生成）
uploads/*.jpg          # アップロードファイル
uploads/*.png
uploads/*.pdf
.DS_Store             # Mac システムファイル
```

## 📦 ダウンロード方法（GenSpark Space）

### 方法 A: ファイルエクスプローラーから一括ダウンロード
1. GenSpark Space の左側メニューから「Files」または「Explorer」を開く
2. プロジェクトルートフォルダを右クリック
3. 「Download」または「Export」を選択
4. ZIP ファイルをダウンロード & 解凍

### 方法 B: 個別ファイルダウンロード
1. 各ファイルを開く
2. 右クリック → 「Save As」または Ctrl+S (Windows) / Cmd+S (Mac)
3. ローカルの同じフォルダ構造で保存

## ✅ チェックリスト

ダウンロード後、以下を確認してください：

- [ ] `server.js` が存在する
- [ ] `package.json` が存在する
- [ ] `public/` フォルダ内に 4 ファイルが存在する
- [ ] `database.js` と `talknote-api.js` が存在する
- [ ] フォルダ構造が上記と一致している

次のステップ: GitHub にアップロード
