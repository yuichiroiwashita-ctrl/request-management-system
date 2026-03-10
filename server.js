require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const { TalknoteAPI, TalknoteOAuth } = require('./talknote-api');

// Google Sheets 連携（オプショナル）
let GoogleSheetsService = null;
let sheetsService = null;

try {
  GoogleSheetsService = require('./google-sheets-service');
  const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';
  sheetsService = SPREADSHEET_ID ? new GoogleSheetsService(SPREADSHEET_ID) : null;
  if (sheetsService) {
    console.log('✅ Google Sheets integration enabled');
  }
} catch (error) {
  console.log('⚠️  Google Sheets integration disabled (optional feature)');
}

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

// アプリのメインページ（簡易ログイン画面）
app.get('/app', (req, res) => {
  const loginPath = path.join(__dirname, 'public', 'login-simple.html');

  if (fs.existsSync(loginPath)) {
    return res.sendFile(loginPath);
  }

  // フォールバック: インラインで簡易ログイン画面を返す
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
      text-align: center;
    }
    .app-subtitle {
      font-size: 16px;
      color: #666;
      margin: 0 0 40px 0;
      text-align: center;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #333;
    }
    .form-select {
      width: 100%;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      font-size: 16px;
      background: white;
      cursor: pointer;
    }
    .form-select:focus {
      outline: none;
      border-color: #2563EB;
    }
    .btn-login {
      width: 100%;
      background: #000;
      color: white;
      border: none;
      padding: 14px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-login:hover {
      opacity: 0.8;
    }
    .btn-login:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .error-message {
      color: #ef4444;
      font-size: 14px;
      margin-top: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="app-name">Request</h1>
    <p class="app-subtitle">社内リクエスト管理システム</p>
    
    <form id="loginForm">
      <div class="form-group">
        <label class="form-label" for="userSelect">ユーザーを選択</label>
        <select id="userSelect" class="form-select" required>
          <option value="">読み込み中...</option>
        </select>
      </div>
      
      <button type="submit" class="btn-login" id="loginButton" disabled>ログイン</button>
      
      <div id="errorMessage" class="error-message" style="display: none;"></div>
    </form>
    
    <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 14px; color: #666; margin-bottom: 15px;">または</p>
      <a href="/api/auth/login" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
        🔐 Talknoteでログイン
      </a>
      <p style="font-size: 12px; color: #999; margin-top: 10px;">※ アクセストークンを取得する場合</p>
    </div>
  </div>

  <script>
    const API_BASE = '';
    
    // ユーザー一覧を読み込み
    async function loadUsers() {
      try {
        const response = await fetch(API_BASE + '/api/users/list');
        const users = await response.json();
        
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">ユーザーを選択してください</option>';
        
        users.forEach(user => {
          const option = document.createElement('option');
          option.value = user.id;
          option.textContent = user.name + ' (' + user.email + ')';
          select.appendChild(option);
        });
        
        document.getElementById('loginButton').disabled = false;
      } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('userSelect').innerHTML = '<option value="">エラー: ユーザーを読み込めませんでした</option>';
      }
    }
    
    // ログイン処理
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const userId = document.getElementById('userSelect').value;
      if (!userId) return;
      
      const button = document.getElementById('loginButton');
      const errorDiv = document.getElementById('errorMessage');
      
      button.disabled = true;
      button.textContent = 'ログイン中...';
      errorDiv.style.display = 'none';
      
      try {
        const response = await fetch(API_BASE + '/api/auth/simple-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId })
        });
        
        if (response.ok) {
          window.location.href = '/dashboard';
        } else {
          throw new Error('ログインに失敗しました');
        }
      } catch (error) {
        console.error('Login failed:', error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        button.disabled = false;
        button.textContent = 'ログイン';
      }
    });
    
    // 初期化
    loadUsers();
  </script>
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
  console.log('=== OAuth Callback ===');
  console.log('Query params:', req.query);
  console.log('Code:', req.query.code);
  console.log('State:', req.query.state);

  const { code } = req.query;

  if (!code) {
    console.error('❌ No code provided');
    return res.send(`
      <html>
        <head><title>Error - No Code</title></head>
        <body style="font-family: sans-serif; padding: 50px; text-align: center;">
          <h1>❌ エラー: 認証コードがありません</h1>
          <p>OAuth コールバックに認証コード（code）が含まれていません。</p>
          <p>Query params: ${JSON.stringify(req.query)}</p>
          <a href="/app" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">ログイン画面に戻る</a>
        </body>
      </html>
    `);
  }

  try {
    console.log('🔄 Exchanging code for token...');
    // アクセストークンを取得
    const tokenData = await talknoteOAuth.exchangeCodeForToken(code);
    console.log('✅ Token received:', tokenData.access_token ? 'Yes' : 'No');
    console.log('   Token type:', typeof tokenData.access_token);
    console.log('   Token length:', tokenData.access_token?.length);
    console.log('   Token (first 20 chars):', tokenData.access_token?.substring(0, 20) + '...');
    console.log('   Full token data keys:', Object.keys(tokenData));

    let userData = null;

    // ユーザー情報取得を試みる（失敗しても続行）
    try {
      console.log('🔄 Attempting to fetch user data...');
      const talknoteAPI = new TalknoteAPI(tokenData.access_token);
      userData = await talknoteAPI.getCurrentUser();
      console.log('✅ User data retrieved:', userData);
    } catch (userError) {
      console.warn('⚠️  Could not fetch user data from Talknote API');
      console.warn('   This is expected if the API endpoints are not documented');
      console.warn('   Continuing with token-only authentication...');
      userData = null;
    }

    // ユーザー情報をDBに保存
    const user = {
      id: userData?.id || userData?.user_id || `talknote_${Date.now()}`,
      name: userData?.name || userData?.username || 'Talknote User',
      email: userData?.email || '',
      avatar_url: userData?.avatar_url || userData?.avatar || '',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || ''
    };

    console.log('💾 Saving user to database...');
    console.log('   User ID:', user.id);
    console.log('   User name:', user.name);
    console.log('   Has access token:', !!user.access_token);
    await database.saveUser(user);
    console.log('✅ User saved');

    // セッションに保存
    req.session.user = user;
    console.log('✅ Session saved');

    console.log('🔄 Redirecting to /dashboard');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);

    // エラー詳細を表示
    res.send(`
      <html>
        <head><title>OAuth Error</title></head>
        <body style="font-family: sans-serif; padding: 50px;">
          <h1>❌ OAuth 認証エラー</h1>
          <h2>エラー内容:</h2>
          <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto;">${error.message}</pre>
          <h2>スタックトレース:</h2>
          <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${error.stack}</pre>
          <a href="/app" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">ログイン画面に戻る</a>
        </body>
      </html>
    `);
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
// ========================================
// 管理者用エンドポイント（トークン管理）
// ========================================

// アクセストークン取得API
app.get('/api/admin/tokens', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;

    if (!user) {
      return res.status(401).json({ error: 'ログインが必要です' });
    }

    res.json({
      user: {
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url
      },
      access_token: user.access_token || '',
      refresh_token: user.refresh_token || ''
    });
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    res.status(500).json({ error: 'トークンの取得に失敗しました' });
  }
});

// トークン管理画面
app.get('/admin/tokens', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-token.html'));
});

// ========================================
// 簡易ログイン（Google スプレッドシート連携用）
// ========================================

// ユーザー一覧取得（Google スプレッドシートから、またはダミーデータ）
app.get('/api/users/list', async (req, res) => {
  try {
    // Google Sheets が利用可能な場合
    if (sheetsService) {
      try {
        const users = await sheetsService.getUsers();
        return res.json(users);
      } catch (error) {
        console.error('Failed to fetch from Google Sheets, falling back to dummy data:', error);
      }
    }

    // フォールバック: ダミーデータ
    console.log('⚠️  Using dummy user data (Google Sheets not configured)');
    res.json([
      {
        id: '1',
        name: '岩下雄一郎',
        email: 'yuichiro@insp.co.jp',
        department: '開発部',
        talknote_user_id: 'user001',
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: '山田太郎',
        email: 'yamada@insp.co.jp',
        department: '営業部',
        talknote_user_id: 'user002',
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: '佐藤花子',
        email: 'sato@insp.co.jp',
        department: '総務部',
        talknote_user_id: 'user003',
        updated_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// グループ一覧取得（Google スプレッドシートから、またはダミーデータ）
app.get('/api/groups/list', async (req, res) => {
  try {
    // Google Sheets が利用可能な場合
    if (sheetsService) {
      try {
        const groups = await sheetsService.getGroups();
        return res.json(groups);
      } catch (error) {
        console.error('Failed to fetch from Google Sheets, falling back to dummy data:', error);
      }
    }

    // フォールバック: ダミーデータ
    console.log('⚠️  Using dummy group data (Google Sheets not configured)');
    res.json([
      {
        id: '1001',
        name: '開発チーム',
        description: '開発関連の議論',
        member_count: 5,
        updated_at: new Date().toISOString()
      },
      {
        id: '1002',
        name: '営業チーム',
        description: '営業報告・相談',
        member_count: 8,
        updated_at: new Date().toISOString()
      },
      {
        id: '1003',
        name: '総務チーム',
        description: '総務・管理業務',
        member_count: 3,
        updated_at: new Date().toISOString()
      }
    ]);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups', details: error.message });
  }
});

// 簡易ログイン
app.post('/api/auth/simple-login', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    let user;

    // ダミーユーザーデータを定義
    const dummyUsers = {
      '1': { id: '1', name: '岩下雄一郎', email: 'yuichiro@insp.co.jp', department: '開発部', talknote_user_id: 'user001' },
      '2': { id: '2', name: '山田太郎', email: 'yamada@insp.co.jp', department: '営業部', talknote_user_id: 'user002' },
      '3': { id: '3', name: '佐藤花子', email: 'sato@insp.co.jp', department: '総務部', talknote_user_id: 'user003' }
    };

    // Google Sheets から取得を試みる
    if (sheetsService) {
      try {
        user = await sheetsService.getUserById(userId);
        if (user) {
          console.log(`✅ User found in Google Sheets: ${user.name}`);
        }
      } catch (error) {
        console.error('Failed to fetch user from Google Sheets:', error);
        // フォールバックへ続行
      }
    }

    // Google Sheets から取得できなかった場合、ダミーデータを使用
    if (!user) {
      user = dummyUsers[userId];
      if (user) {
        console.log(`⚠️  Using dummy user data: ${user.name}`);
      }
    }

    // ユーザーが見つからない場合
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // セッションに保存
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: '',
      access_token: '',  // 空文字列（nullではなく）
      refresh_token: '',  // 空文字列（nullではなく）
      talknote_user_id: user.talknote_user_id || ''
    };

    // DBに保存
    await database.saveUser(req.session.user);

    console.log(`✅ Login successful: ${user.name} (${user.email})`);
    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error('Simple login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// ========================================
// Talknote APIエンドポイント
// ========================================

// Talknote API エンドポイントをテストするデバッグページ
app.get('/debug/talknote', requireAuth, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Talknote API デバッグ</title>
      <style>
        body { font-family: sans-serif; max-width: 1200px; margin: 50px auto; padding: 20px; }
        h1 { color: #4285f4; }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        button { padding: 10px 20px; margin: 10px 5px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #357ae8; }
        button.btn-success { background: #0f9d58; }
        button.btn-success:hover { background: #0d8547; }
        input { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; width: 200px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 4px; overflow-x: auto; max-height: 400px; }
        .success { color: #0f9d58; }
        .error { color: #db4437; }
        .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <h1>🧪 Talknote API デバッグツール</h1>
      
      <div class="section">
        <h2>アクセストークン</h2>
        <p>現在のアクセストークン: <code>${req.session.user.access_token ? req.session.user.access_token.substring(0, 20) + '...' : '未設定'}</code></p>
      </div>
      
      <div class="info">
        <h3>📖 Talknote API の制限事項</h3>
        <p>公式ドキュメント（<a href="https://developer.talknote.com/doc/" target="_blank">https://developer.talknote.com/doc/</a>）によると、以下のAPIのみ利用可能です：</p>
        <ul>
          <li>✅ DM（ダイレクトメッセージ）関連 API</li>
          <li>✅ グループ（ノート）への投稿 API</li>
          <li>❌ ユーザー一覧取得 API（存在しません）</li>
          <li>❌ グループ一覧取得 API（存在しません）</li>
        </ul>
        <p><strong>グループ ID の取得方法:</strong> Talknote のグループページの URL（例: https://talknote.com/groups/12345）から <code>12345</code> を取得してください。</p>
      </div>
      
      <div class="section">
        <h2>📝 DM 関連 API テスト</h2>
        <button onclick="testAPI('/dm')">DM スレッド一覧取得</button>
        <div id="result-dm"></div>
      </div>
      
      <div class="section">
        <h2>📝 グループ（ノート）API テスト</h2>
        <p>グループ ID を入力してテストしてください:</p>
        <input type="text" id="group-id" placeholder="グループID (例: 12345)">
        <button onclick="testGroupAPI()">グループ情報取得</button>
        <button class="btn-success" onclick="testPostToGroup()">テスト投稿（注意！）</button>
        <div id="result-group"></div>
      </div>
      
      <script>
        async function testAPI(endpoint) {
          const resultDiv = document.getElementById('result-dm');
          resultDiv.innerHTML = '<p>🔄 テスト中...</p>';
          
          try {
            const response = await fetch('/debug/talknote/test?endpoint=' + encodeURIComponent(endpoint));
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<div class="success"><h3>✅ 成功: ' + endpoint + '</h3><pre>' + JSON.stringify(data.data, null, 2) + '</pre></div>';
            } else {
              resultDiv.innerHTML = '<div class="error"><h3>❌ 失敗: ' + endpoint + '</h3><p>' + (data.message || '不明なエラー') + '</p><pre>' + JSON.stringify(data.results || data.error, null, 2) + '</pre></div>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="error"><h3>❌ エラー</h3><pre>' + error.toString() + '</pre></div>';
          }
        }
        
        async function testGroupAPI() {
          const groupId = document.getElementById('group-id').value;
          if (!groupId) {
            alert('グループIDを入力してください');
            return;
          }
          
          const resultDiv = document.getElementById('result-group');
          resultDiv.innerHTML = '<p>🔄 テスト中...</p>';
          
          try {
            const response = await fetch('/debug/talknote/test?endpoint=' + encodeURIComponent('/group/' + groupId));
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<div class="success"><h3>✅ 成功: /group/' + groupId + '</h3><pre>' + JSON.stringify(data.data, null, 2) + '</pre></div>';
            } else {
              resultDiv.innerHTML = '<div class="error"><h3>❌ 失敗: /group/' + groupId + '</h3><p>' + (data.message || '不明なエラー') + '</p><pre>' + JSON.stringify(data.results || data.error, null, 2) + '</pre></div>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="error"><h3>❌ エラー</h3><pre>' + error.toString() + '</pre></div>';
          }
        }
        
        async function testPostToGroup() {
          const groupId = document.getElementById('group-id').value;
          if (!groupId) {
            alert('グループIDを入力してください');
            return;
          }
          
          if (!confirm('グループ ' + groupId + ' にテストメッセージを投稿しますか？\\n（実際に投稿されます！）')) {
            return;
          }
          
          const resultDiv = document.getElementById('result-group');
          resultDiv.innerHTML = '<p>🔄 投稿中...</p>';
          
          try {
            const response = await fetch('/debug/talknote/post-test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ groupId })
            });
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = '<div class="success"><h3>✅ 投稿成功!</h3><pre>' + JSON.stringify(data.data, null, 2) + '</pre></div>';
            } else {
              resultDiv.innerHTML = '<div class="error"><h3>❌ 投稿失敗</h3><p>' + (data.message || '不明なエラー') + '</p><pre>' + JSON.stringify(data.error, null, 2) + '</pre></div>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="error"><h3>❌ エラー</h3><pre>' + error.toString() + '</pre></div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// デバッグ用: グループへのテスト投稿
app.post('/debug/talknote/post-test', requireAuth, async (req, res) => {
  const { groupId } = req.body;

  if (!groupId) {
    return res.status(400).json({ success: false, error: 'groupId is required' });
  }

  try {
    const axios = require('axios');
    const url = `https://eapi.talknote.com/api/v1/group/post/${groupId}`;

    console.log(`📤 Posting test message to group ${groupId}...`);

    const response = await axios({
      method: 'POST',
      url: url,
      headers: {
        'Authorization': `Bearer ${req.session.user.access_token}`,
        'Content-Type': 'application/json'
      },
      data: {
        message: '🧪 Request管理システムからのテスト投稿です。\n\nこのメッセージは Talknote API が正常に動作しているか確認するためのものです。'
      }
    });

    console.log(`✅ Test post successful: ${response.status}`);

    res.json({
      success: true,
      message: '投稿に成功しました！',
      status: response.status,
      data: response.data
    });

  } catch (error) {
    console.error('❌ Test post failed:', error.response?.status, error.response?.data);

    res.json({
      success: false,
      message: '投稿に失敗しました',
      status: error.response?.status,
      error: error.response?.data || error.message
    });
  }
});

// デバッグ用: 任意のエンドポイントをテスト（複数のベースURLを試す）
app.get('/debug/talknote/test', requireAuth, async (req, res) => {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ success: false, error: 'endpoint parameter is required' });
  }

  // 試すベースURLのリスト
  const baseURLs = [
    'https://eapi.talknote.com/api/v1',
    'https://eapi.talknote.com/api/v2',
    'https://eapi.talknote.com/v1',
    'https://eapi.talknote.com/v2',
    'https://eapi.talknote.com',
    'https://api.talknote.com/api/v1',
    'https://api.talknote.com/api/v2',
    'https://api.talknote.com/v1',
    'https://api.talknote.com/v2',
    'https://api.talknote.com'
  ];

  const results = [];

  for (const baseURL of baseURLs) {
    try {
      const axios = require('axios');
      const fullURL = `${baseURL}${endpoint}`;

      console.log(`🔍 Trying: ${fullURL}`);

      const response = await axios({
        method: 'GET',
        url: fullURL,
        headers: {
          'Authorization': `Bearer ${req.session.user.access_token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log(`✅ Success: ${fullURL} (${response.status})`);

      results.push({
        baseURL,
        fullURL,
        success: true,
        status: response.status,
        data: response.data
      });

      // 成功したら即座に返す
      return res.json({
        success: true,
        endpoint,
        baseURL,
        fullURL,
        status: response.status,
        data: response.data,
        message: `✅ 成功! ベースURL: ${baseURL}`
      });

    } catch (error) {
      console.log(`❌ Failed: ${baseURL}${endpoint} (${error.response?.status || error.code})`);

      results.push({
        baseURL,
        fullURL: `${baseURL}${endpoint}`,
        success: false,
        status: error.response?.status || error.code,
        error: error.response?.data || error.message
      });
    }
  }

  // すべて失敗した場合
  res.json({
    success: false,
    endpoint,
    message: 'すべてのベースURLで失敗しました',
    results
  });
});

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
