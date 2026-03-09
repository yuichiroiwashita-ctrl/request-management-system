# 🔧 公開環境トラブルシューティングガイド

## 問題: {"detail":"Not Found"} エラー

公開環境で "Not Found" エラーが表示される場合の対処方法です。

---

## ✅ 実施した修正内容

### 1. **プロキシ環境対応**
```javascript
app.set('trust proxy', true);
```
リバースプロキシ経由でのアクセスに対応。

### 2. **静的ファイル配信の最適化**
```javascript
app.use(express.static(path.join(__dirname, 'public'), {
  index: false, // index.htmlの自動配信を無効化
  setHeaders: (res, filePath) => {
    console.log(`[Static File] Serving: ${filePath}`);
  }
}));
```

### 3. **明示的なルート定義とエラーハンドリング**
```javascript
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  
  // ファイルの存在確認
  if (!fs.existsSync(indexPath)) {
    return res.status(500).send('index.html not found');
  }
  
  res.sendFile(indexPath);
});
```

### 4. **詳細なリクエストログ**
すべてのリクエストをコンソールに出力。

### 5. **起動時のファイル確認**
サーバー起動時に必要なファイルの存在を確認。

---

## 🔍 デバッグ方法

### ステップ1: ログを確認
サーバー起動時に以下のログが表示されるはずです：

```
🚀 Server running on http://localhost:3000
📝 Environment: production
📁 Working directory: /app
📁 Public directory: /app/public

📄 File Check:
   index.html: ✅ Found
   dashboard.html: ✅ Found
   styles.css: ✅ Found
   dashboard.js: ✅ Found
```

もし `❌ Not Found` が表示される場合、ファイルが正しくデプロイされていません。

### ステップ2: リクエストログを確認
ブラウザでアクセスすると、以下のようなログが出力されます：

```
[Request] GET /
[Root Route] Serving index.html from: /app/public/index.html
```

### ステップ3: ファイル構造を確認
publicディレクトリに以下のファイルがあることを確認：

```
public/
├── index.html
├── dashboard.html
├── styles.css
└── dashboard.js
```

---

## 🚨 よくある問題と解決策

### 問題1: ファイルが見つからない

**症状:**
```
[Error] index.html not found at: /app/public/index.html
```

**解決策:**
- デプロイ時に `public/` ディレクトリが含まれているか確認
- `.gitignore` で `public/` が除外されていないか確認

### 問題2: 静的ファイルが読み込まれない

**症状:**
CSSやJavaScriptが読み込まれない

**解決策:**
1. ブラウザの開発者ツールでネットワークタブを確認
2. 404エラーになっているリソースを特定
3. ファイルパスが正しいか確認

### 問題3: セッションが保持されない

**症状:**
ログイン後すぐにログアウトされる

**解決策:**
環境変数で `NODE_ENV=production` を設定し、HTTPS経由でアクセス

---

## 📋 チェックリスト

公開前に以下を確認してください：

- [ ] `public/` ディレクトリがデプロイされている
- [ ] 環境変数 `NODE_ENV=production` が設定されている
- [ ] 環境変数 `SESSION_SECRET` が設定されている（本番用の値）
- [ ] Talknote API設定が正しい（リダイレクトURLなど）
- [ ] HTTPSでアクセスしている
- [ ] サーバーログでファイルチェックが ✅ になっている

---

## 🔧 GenSpark Space固有の設定

GenSpark Spaceでデプロイする場合：

1. **ポート設定**: 自動的に割り当てられるため、`process.env.PORT` を使用
2. **HTTPS**: 自動的にHTTPS化されるため、`secure: true` で問題なし
3. **Trust Proxy**: リバースプロキシ経由なので `trust proxy` を有効化済み

---

## 📞 サポート

それでも問題が解決しない場合：

1. サーバーログ全体をコピー
2. ブラウザのコンソールログをコピー
3. アクセスしているURLを確認
4. 上記の情報と共に問い合わせ

---

**最終更新**: 2024-03-08
