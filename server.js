require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const { TalknoteAPI, TalknoteOAuth } = require('./talknote-api');

const app = express();
// GenSpark Spaceを含む様々な環境に対応
const PORT = process.env.PORT || process.env.GENSPARK_PORT || process.env.SERVER_PORT || 8080;

// プロキシ環境対応
app.set('trust proxy', true);

// GenSpark環境チェック
console.log('🔧 Environment Configuration:');
console.log('   PORT:', PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('   AVAILABLE ENV VARS:', Object.keys(process.env).filter(k => k.includes('PORT') || k.includes('HOST')).join(', '));
console.log('');

// アップロードディレクトリの作成
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Talknote OAuth設定
const talknoteOAuth = new TalknoteOAuth(
  process.env.TALKNOTE_CLIENT_ID,
  process.env.TALKNOTE_CLIENT_SECRET,
  process.env.TALKNOTE_REDIRECT_URI || 'http://localhost:3000/api/callback'
);

// ミドルウェア（順序重要）
// 1. JSONパーサー
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24時間
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // 本番環境ではHTTPS必須
  }
}));

// 3. リクエストログ（デバッグ用）
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 4. 静的ファイル配信（publicディレクトリ）
// 重要: ルート定義の前に配置し、ファイルが存在する場合は優先的に配信
app.use('/styles.css', express.static(path.join(__dirname, 'public', 'styles.css')));
app.use('/dashboard.js', express.static(path.join(__dirname, 'public', 'dashboard.js')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ========================================
// 認証ミドルウェア
// ========================================

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// ========================================
// ページルート
// ========================================

// デバッグ: ルート処理前のログ
app.use((req, res, next) => {
  // ページルート（HTML）のみログ出力
  if (!req.path.startsWith('/api/') && !req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    console.log(`[Page Route Handler] ${req.method} ${req.path}`);
  }
  next();
});

// ヘルスチェック用エンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// デバッグページ
app.get('/debug', (req, res) => {
  const debugPath = path.join(__dirname, 'debug.html');
  if (fs.existsSync(debugPath)) {
    return res.sendFile(debugPath);
  }
  res.status(404).send('Debug page not found');
});

// ルートパス - index.htmlを返す（複数のパスを試行）
app.get('/', (req, res) => {
  // 1. ルートディレクトリのindex.html（GenSpark用）
  const rootIndexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndexPath)) {
    console.log(`[Root Route] Serving root index.html from: ${rootIndexPath}`);
    return res.sendFile(rootIndexPath);
  }

  // 2. publicディレクトリのindex.html
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  console.log(`[Root Route] Serving public index.html from: ${publicIndexPath}`);

  // ファイルの存在確認
  if (!fs.existsSync(publicIndexPath)) {
    console.error(`[Error] index.html not found at: ${publicIndexPath}`);
    return res.status(500).send(`
      <h1>Configuration Error</h1>
      <p>index.html not found</p>
      <p>Looking at: ${publicIndexPath}</p>
      <p>Working directory: ${__dirname}</p>
      <p>Files in directory: ${fs.readdirSync(__dirname).join(', ')}</p>
    `);
  }

  res.sendFile(publicIndexPath);
});

// アプリのメインページ（ログイン画面）
app.get('/app', (req, res) => {
  // インラインでログイン画面を返す
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request - ログイン</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-container {
      text-align: center;
      background: white;
      padding: 60px 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 90%;
    }
    .app-name {
      font-size: 48px;
      font-weight: 300;
      margin: 0 0 10px 0;
      color: #000;
    }
    .app-subtitle {
      font-size: 16px;
      color: #666;
      margin: 0 0 40px 0;
    }
    .btn-login {
      display: inline-block;
      background: #000;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .btn-login:hover {
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="app-name">Request</h1>
    <p class="app-subtitle">社内リクエスト管理システム</p>
    <a href="/api/auth/login" class="btn-login">Talknoteでログイン</a>
  </div>
</body>
</html>
  `);
});

// ダッシュボードパス - 認証チェック付き
app.get('/dashboard', (req, res) => {
  console.log(`[Dashboard] Access attempt - Session exists: ${!!req.session}, User exists: ${!!req.session?.user}`);

  if (!req.session || !req.session.user) {
    console.log('[Dashboard] Unauthorized access, redirecting to /app');
    return res.redirect('/app');
  }

  const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
  console.log(`[Dashboard Route] Attempting to serve: ${dashboardPath}`);
  console.log(`[Dashboard Route] File exists: ${fs.existsSync(dashboardPath)}`);

  // ファイルの存在確認
  if (!fs.existsSync(dashboardPath)) {
    console.error(`[Error] dashboard.html not found at: ${dashboardPath}`);

    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - File Not Found</title>
        <style>
          body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
          h1 { color: #f48771; }
          pre { background: #252526; padding: 15px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>❌ Error: dashboard.html not found</h1>
        <pre>
Expected path: ${dashboardPath}
Working directory: ${__dirname}

Directory contents:
${fs.readdirSync(__dirname).map(f => '  - ' + f).join('\n')}

Public directory exists: ${fs.existsSync(path.join(__dirname, 'public'))}
${fs.existsSync(path.join(__dirname, 'public')) ? `\nPublic directory contents:\n${fs.readdirSync(path.join(__dirname, 'public')).map(f => '  - ' + f).join('\n')}` : ''}
        </pre>
        <p><a href="/" style="color: #4ec9b0;">← Back to Home</a></p>
        <p><a href="/debug" style="color: #4ec9b0;">→ Go to Debug Page</a></p>
      </body>
      </html>
    `);
  }

  console.log(`[Dashboard Route] Sending file: ${dashboardPath}`);
  res.sendFile(dashboardPath, (err) => {
    if (err) {
      console.error(`[Dashboard Route] Error sending file:`, err);
      res.status(500).send('Error loading dashboard');
    }
  });
});

// ========================================
// 認証エンドポイント
// ========================================

// ログインページへリダイレクト
app.get('/api/auth/login', (req, res) => {
  const authUrl = talknoteOAuth.getAuthorizationURL();
  res.redirect(authUrl);
});

// OAuth コールバック（Talknote が /api/ にリダイレクトする場合に対応）
app.get('/api/', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // アクセストークンを取得
    const tokenData = await talknoteOAuth.exchangeCodeForToken(code);

    // Talknote APIでユーザー情報を取得
    const talknoteAPI = new TalknoteAPI(tokenData.access_token);
    const userData = await talknoteAPI.getCurrentUser();

    // ユーザー情報をDBに保存
    const user = {
      id: userData.id || userData.user_id || String(Date.now()),
      name: userData.name || userData.username || 'Unknown User',
      email: userData.email || '',
      avatar_url: userData.avatar_url || userData.avatar || '',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    };

    await database.saveUser(user);

    // セッションに保存
    req.session.user = user;

    // カスタムドメインにリダイレクト
    const redirectUrl = process.env.APP_URL || 'https://request.insp.co.jp';
    res.redirect(`${redirectUrl}/dashboard`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// ログアウト
app.get('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// 現在のユーザー情報取得
app.get('/api/user', requireAuth, (req, res) => {
  res.json(req.session.user);
});

// ========================================
// Talknote APIエンドポイント
// ========================================

// ユーザー一覧取得
app.get('/api/talknote/users', requireAuth, async (req, res) => {
  try {
    const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
    const users = await talknoteAPI.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// グループ一覧取得
app.get('/api/talknote/groups', requireAuth, async (req, res) => {
  try {
    const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
    const groups = await talknoteAPI.getGroups();
    res.json(groups);
  } catch (error) {
    console.error('Groups fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// ========================================
// リクエスト管理エンドポイント
// ========================================

// リクエスト一覧取得
app.get('/api/requests', requireAuth, async (req, res) => {
  try {
    const requests = await database.getRequestsByUser(req.session.user.id);
    res.json(requests);
  } catch (error) {
    console.error('Requests fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
});

// リクエスト詳細取得
app.get('/api/requests/:id', requireAuth, async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 権限チェック
    if (request.sender_id !== req.session.user.id && request.recipient_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(request);
  } catch (error) {
    console.error('Request fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch request' });
  }
});

// リクエスト作成
app.post('/api/requests', requireAuth, async (req, res) => {
  try {
    const { title, content, deadline, recipient_id, recipient_name, talknote_group_id, talknote_group_name } = req.body;

    if (!title || !content || !deadline || !recipient_id || !talknote_group_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const request = {
      title,
      content,
      deadline,
      sender_id: req.session.user.id,
      sender_name: req.session.user.name,
      recipient_id,
      recipient_name,
      talknote_group_id,
      talknote_group_name
    };

    const requestId = await database.createRequest(request);

    // Talknoteに通知
    try {
      const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
      const message = `【新規リクエスト】${req.session.user.name} より\n\n` +
        `タイトル: ${title}\n` +
        `宛先: ${recipient_name}\n` +
        `期日: ${new Date(deadline).toLocaleString('ja-JP')}\n\n` +
        `内容:\n${content}`;

      await talknoteAPI.postMessage(talknote_group_id, message);
    } catch (error) {
      console.error('Talknote notification error:', error);
      // 通知失敗してもリクエストは作成済みなのでエラーにしない
    }

    res.status(201).json({ id: requestId, message: 'Request created' });
  } catch (error) {
    console.error('Request creation error:', error);
    res.status(500).json({ message: 'Failed to create request' });
  }
});

// リクエストに回答
app.put('/api/requests/:id/respond', requireAuth, async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 受信者のみが回答可能
    if (request.recipient_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { status, response_type, response_condition } = req.body;

    if (!status || !response_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await database.updateRequestStatus(req.params.id, status, { response_type, response_condition });

    // Talknoteに通知
    try {
      const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
      const responseTypeMap = {
        yes: 'Yes（承認）',
        conditional: '条件付きYes',
        no: 'No（却下）'
      };

      let message = `【リクエスト回答】${req.session.user.name} より\n\n` +
        `リクエスト: ${request.title}\n` +
        `回答: ${responseTypeMap[response_type]}`;

      if (response_condition) {
        message += `\n条件: ${response_condition}`;
      }

      await talknoteAPI.postMessage(request.talknote_group_id, message);
    } catch (error) {
      console.error('Talknote notification error:', error);
    }

    res.json({ message: 'Response submitted' });
  } catch (error) {
    console.error('Response submission error:', error);
    res.status(500).json({ message: 'Failed to submit response' });
  }
});

// 完了報告
app.post('/api/requests/:id/complete', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 受信者のみが完了報告可能
    if (request.recipient_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ message: 'Missing report content' });
    }

    const completionData = {
      report,
      file_path: req.file ? req.file.filename : null,
      completed_at: new Date().toISOString(),
      deadline: request.deadline
    };

    await database.completeRequest(req.params.id, completionData);

    // Talknoteに通知
    try {
      const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
      const deadlineMet = new Date(completionData.completed_at) <= new Date(request.deadline);

      let message = `【完了報告】${req.session.user.name} より\n\n` +
        `リクエスト: ${request.title}\n` +
        `ステータス: ${deadlineMet ? '✅ 期日内完了' : '⚠️ 期日超過'}\n` +
        `完了日時: ${new Date(completionData.completed_at).toLocaleString('ja-JP')}\n\n` +
        `報告内容:\n${report}`;

      if (req.file) {
        message += `\n\n📎 添付ファイル: ${req.file.originalname}`;
      }

      await talknoteAPI.postMessage(request.talknote_group_id, message);
    } catch (error) {
      console.error('Talknote notification error:', error);
    }

    res.json({ message: 'Completion report submitted' });
  } catch (error) {
    console.error('Completion submission error:', error);
    res.status(500).json({ message: 'Failed to submit completion report' });
  }
});

// ========================================
// 期日延長エンドポイント
// ========================================

// 期日延長申請
app.post('/api/requests/:id/extension', requireAuth, async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 受信者のみが延長申請可能
    if (request.recipient_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // 承認済みのリクエストのみ延長申請可能
    if (request.status !== 'accepted') {
      return res.status(400).json({ message: 'Can only request extension for accepted requests' });
    }

    // 期日前のみ延長申請可能
    if (new Date() >= new Date(request.deadline)) {
      return res.status(400).json({ message: 'Cannot request extension after deadline' });
    }

    // 既に延長申請中でないか確認
    const pendingExtension = await database.getPendingExtensionRequest(req.params.id);
    if (pendingExtension) {
      return res.status(400).json({ message: 'Extension request already pending' });
    }

    const { new_deadline, reason } = req.body;

    if (!new_deadline || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 新期日が現在の期日より後であることを確認
    if (new Date(new_deadline) <= new Date(request.deadline)) {
      return res.status(400).json({ message: 'New deadline must be after current deadline' });
    }

    const extensionData = {
      request_id: req.params.id,
      requester_id: req.session.user.id,
      new_deadline,
      reason
    };

    await database.createExtensionRequest(extensionData);

    // Talknoteに通知
    try {
      const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
      const message = `【期日延長申請】${req.session.user.name} より\n\n` +
        `リクエスト: ${request.title}\n` +
        `現在の期日: ${new Date(request.deadline).toLocaleString('ja-JP')}\n` +
        `希望新期日: ${new Date(new_deadline).toLocaleString('ja-JP')}\n\n` +
        `理由:\n${reason}`;

      await talknoteAPI.postMessage(request.talknote_group_id, message);
    } catch (error) {
      console.error('Talknote notification error:', error);
    }

    res.status(201).json({ message: 'Extension request submitted' });
  } catch (error) {
    console.error('Extension request error:', error);
    res.status(500).json({ message: 'Failed to submit extension request' });
  }
});

// 期日延長申請履歴取得
app.get('/api/requests/:id/extensions', requireAuth, async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 権限チェック
    if (request.sender_id !== req.session.user.id && request.recipient_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const extensions = await database.getExtensionRequestsByRequestId(req.params.id);
    res.json(extensions);
  } catch (error) {
    console.error('Extension history fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch extension history' });
  }
});

// 期日延長申請への回答
app.put('/api/requests/:id/extension/:extensionId', requireAuth, async (req, res) => {
  try {
    const request = await database.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // 送信者のみが延長申請に回答可能
    if (request.sender_id !== req.session.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await database.respondToExtensionRequest(req.params.extensionId, action);

    // Talknoteに通知
    try {
      const talknoteAPI = new TalknoteAPI(req.session.user.access_token);
      const actionText = action === 'approve' ? '承認' : '却下';

      let message = `【期日延長 ${actionText}】${req.session.user.name} より\n\n` +
        `リクエスト: ${request.title}\n`;

      if (action === 'approve') {
        message += `新しい期日: ${new Date(result.extension.new_deadline).toLocaleString('ja-JP')}`;
      } else {
        message += `期日: ${new Date(request.deadline).toLocaleString('ja-JP')} のまま変更なし`;
      }

      await talknoteAPI.postMessage(request.talknote_group_id, message);
    } catch (error) {
      console.error('Talknote notification error:', error);
    }

    res.json({ message: `Extension ${action}d` });
  } catch (error) {
    console.error('Extension response error:', error);
    res.status(500).json({ message: 'Failed to respond to extension request' });
  }
});

// ========================================
// 統計情報エンドポイント
// ========================================

app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const stats = await database.getStats(req.session.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ========================================
// 404ハンドラー（最後に配置）
// ========================================

// キャッチオール: すべての未定義ルートを処理
app.use((req, res, next) => {
  console.log(`[404] Path not found: ${req.method} ${req.path}`);
  console.log(`[404] Headers:`, req.headers);
  console.log(`[404] Query:`, req.query);

  // APIリクエストの場合
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      availableEndpoints: [
        'GET /api/user',
        'GET /api/talknote/users',
        'GET /api/talknote/groups',
        'GET /api/requests',
        'POST /api/requests',
        'GET /api/stats'
      ]
    });
  }

  // HTMLリクエストの場合
  if (req.accepts('html')) {
    console.log(`[404] Redirecting HTML request to /`);
    return res.redirect('/');
  }

  // その他（JSON、CSS、JSなど）
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'The requested resource was not found on this server'
  });
});

// ========================================
// サーバー起動
// ========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Server running`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`${'='.repeat(60)}`);

  console.log(`\n📁 Directories:`);
  console.log(`   Working directory: ${__dirname}`);
  console.log(`   Public directory: ${path.join(__dirname, 'public')}`);

  // ディレクトリ内容の確認
  console.log(`\n📂 Root directory contents:`);
  try {
    const rootFiles = fs.readdirSync(__dirname);
    rootFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
    });
  } catch (error) {
    console.error(`   Error reading directory: ${error.message}`);
  }

  // Public ディレクトリの確認
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    console.log(`\n📂 Public directory contents:`);
    try {
      const publicFiles = fs.readdirSync(publicDir);
      publicFiles.forEach(file => {
        console.log(`   📄 ${file}`);
      });
    } catch (error) {
      console.error(`   Error reading public directory: ${error.message}`);
    }
  } else {
    console.log(`\n⚠️  Public directory not found!`);
  }

  // ファイルチェック
  const rootIndexPath = path.join(__dirname, 'index.html');
  const publicIndexPath = path.join(publicDir, 'index.html');
  const dashboardPath = path.join(publicDir, 'dashboard.html');
  const stylesPath = path.join(publicDir, 'styles.css');
  const jsPath = path.join(publicDir, 'dashboard.js');

  console.log(`\n📄 File Check:`);
  console.log(`   ROOT index.html: ${fs.existsSync(rootIndexPath) ? '✅ Found' : '❌ Not Found'}`);
  console.log(`   PUBLIC index.html: ${fs.existsSync(publicIndexPath) ? '✅ Found' : '❌ Not Found'}`);
  console.log(`   dashboard.html: ${fs.existsSync(dashboardPath) ? '✅ Found' : '❌ Not Found'}`);
  console.log(`   styles.css: ${fs.existsSync(stylesPath) ? '✅ Found' : '❌ Not Found'}`);
  console.log(`   dashboard.js: ${fs.existsSync(jsPath) ? '✅ Found' : '❌ Not Found'}`);

  console.log(`\n🌐 Available Routes:`);
  console.log(`   GET  /              - Root (test page)`);
  console.log(`   GET  /health        - Health check`);
  console.log(`   GET  /app           - Main app (login)`);
  console.log(`   GET  /dashboard     - Dashboard (auth required)`);
  console.log(`   GET  /api/*         - API endpoints`);

  console.log(`\n✨ Minimal design version with deadline extension feature`);
  console.log(`${'='.repeat(60)}\n`);
});
