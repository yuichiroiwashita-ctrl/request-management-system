# ✅ 次にやること - チェックリスト

## 現在の状況
🟡 **アプリは正しく動作していますが、サーバーが起動していません**

スクリーンショットの「サーバー未起動」メッセージは正常です。
これはNode.jsサーバーが起動していないことを検出しています。

---

## 📋 やるべきこと（順番に）

### ☐ 1. GenSpark Spaceの設定画面を開く

プロジェクトの設定またはデプロイ設定を探してください。

**探すべきメニュー名**:
- Settings / 設定
- Deploy Settings / デプロイ設定  
- Build & Deploy / ビルドとデプロイ
- Project Configuration / プロジェクト設定

### ☐ 2. プロジェクトタイプを確認・変更

**現在**: Static Site / Frontend / Static Hosting  
**変更先**: **Node.js Application / Backend / Node.js**

もし変更できない場合 → ステップ6へ

### ☐ 3. ビルドコマンドを設定

```
npm install
```

### ☐ 4. 起動コマンドを設定

```
npm start
```

または

```
node server.js
```

### ☐ 5. 環境変数を設定（重要）

```
NODE_ENV=production
PORT=8080
SESSION_SECRET=change-this-to-random-string
```

### ☐ 6. 保存して再デプロイ

"Save" → "Deploy" または "Redeploy" ボタンをクリック

### ☐ 7. デプロイログを確認

ログに以下が表示されるか確認：

```
🚀 Server running
   URL: http://localhost:8080
```

### ☐ 8. 動作確認

```
https://sbbosryj.gensparkspace.com/health
```

にアクセスして `{"status":"ok"}` が表示されるか確認

### ☐ 9. アプリを開く

```
https://sbbosryj.gensparkspace.com/
```

にアクセスして正常に動作するか確認

---

## 🚨 設定画面が見つからない / 変更できない場合

### オプションA: サポートに問い合わせ

GenSpark Spaceのサポートチャットまたはメールで：

```
プロジェクト: request-management-system
URL: https://sbbosryj.gensparkspace.com

このプロジェクトをNode.jsアプリケーションとして設定したいです。
設定変更方法を教えていただけますか？

必要な設定:
- Type: Node.js Application
- Build: npm install
- Start: npm start
- Port: 8080
```

### オプションB: 別のサービスに移行

GenSpark SpaceがNode.jsをサポートしていない場合、
以下のサービスへの移行を検討：

1. **Heroku** (https://heroku.com)
   - 完全無料プランあり
   - `git push` でデプロイ
   - 5分で開始可能

2. **Railway** (https://railway.app)
   - 無料プランあり
   - GitHub連携
   - 自動デプロイ

3. **Render** (https://render.com)
   - 無料プランあり
   - Web UIから設定
   - 簡単セットアップ

すべての設定ファイル（Procfile、package.jsonなど）は準備済みです。

---

## 📊 現在の状態

```
✅ コードは正しい
✅ ファイル構造は正しい
✅ 設定ファイルは準備完了
❌ Node.jsサーバーが起動していない ← これを修正する必要がある
```

---

## 🎯 ゴール

```
https://sbbosryj.gensparkspace.com/health
```

このURLにアクセスして、以下が表示されること：

```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": 123.45,
  "environment": "production",
  "port": 8080
}
```

これが表示されれば **完全に成功** です！🎉

---

## 📞 困ったら

以下のファイルを参照：

1. **`GENSPARK_SETTINGS_GUIDE.md`** - 詳細な設定手順
2. **`STATIC_MODE_DIAGNOSIS.md`** - 問題の診断結果
3. **`URGENT_FIX.md`** - 緊急対応手順

---

**最も重要なこと**: GenSpark Spaceの設定を「Node.js Application」に変更すること

それができれば、すべて解決します！💪
