/**
 * Talknote データ同期スクリプト（OAuth版）
 * 既存のOAuthアプリを使用してユーザー情報とグループ一覧を取得
 * 
 * セットアップ手順：
 * 1. このスクリプトをGoogle Apps Scriptエディタに貼り付け
 * 2. 下記の定数を設定
 * 3. 一度だけ authorizeOAuth() を実行して認証
 * 4. その後 updateAllData() を実行してデータ取得
 * 5. setupTrigger() で自動更新を設定
 */

// ⚠️ 重要: Talknote OAuth設定
const TALKNOTE_CLIENT_ID = 'd2f29c73bb4495431543e2af5edcce52502a3075';
const TALKNOTE_CLIENT_SECRET = 'ae327074d9a86851be92bad956eedd8bd64958a2';
const TALKNOTE_REDIRECT_URI = 'https://script.google.com/macros/d/[YOUR_SCRIPT_ID]/usercallback';
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

// アクセストークンを保存するプロパティキー
const TOKEN_PROPERTY_KEY = 'TALKNOTE_ACCESS_TOKEN';

/**
 * アクセストークンを取得（PropertiesServiceから）
 */
function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(TOKEN_PROPERTY_KEY);
}

/**
 * アクセストークンを保存
 */
function saveAccessToken(token) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(TOKEN_PROPERTY_KEY, token);
  Logger.log('アクセストークンを保存しました');
}

/**
 * 手動でアクセストークンを設定（初回のみ）
 * 
 * 使い方：
 * 1. Talknoteにログイン
 * 2. ブラウザのデベロッパーツールを開く（F12）
 * 3. Network タブを開く
 * 4. Talknoteで何か操作（グループ閲覧など）
 * 5. リクエストヘッダーの Authorization: Bearer xxxxx の xxxxx をコピー
 * 6. この関数の引数に貼り付けて実行
 */
function setAccessTokenManually() {
  // ⚠️ ここに手動で取得したアクセストークンを貼り付けて実行
  const token = 'YOUR_ACCESS_TOKEN_HERE';
  
  if (token === 'YOUR_ACCESS_TOKEN_HERE') {
    Logger.log('❌ エラー: アクセストークンを設定してください');
    return;
  }
  
  saveAccessToken(token);
  Logger.log('✅ アクセストークンを設定しました');
  
  // テスト実行
  testConnection();
}

/**
 * 接続テスト
 */
function testConnection() {
  const token = getAccessToken();
  
  if (!token) {
    Logger.log('❌ アクセストークンが設定されていません');
    return false;
  }
  
  try {
    const url = 'https://eapi.talknote.com/api/v1/users';
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('✅ Talknote API接続成功！');
      return true;
    } else {
      Logger.log(`❌ API接続失敗: ステータスコード ${responseCode}`);
      Logger.log(`レスポンス: ${response.getContentText()}`);
      return false;
    }
  } catch (error) {
    Logger.log(`❌ エラー: ${error.toString()}`);
    return false;
  }
}

/**
 * ユーザー情報を更新
 */
function updateUsers() {
  const token = getAccessToken();
  
  if (!token) {
    Logger.log('❌ アクセストークンが設定されていません。setAccessTokenManually() を実行してください。');
    return;
  }
  
  try {
    Logger.log('ユーザー情報の取得を開始...');
    
    const url = 'https://eapi.talknote.com/api/v1/users';
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log(`❌ エラー: ステータスコード ${responseCode}`);
      Logger.log(`レスポンス: ${response.getContentText()}`);
      return;
    }
    
    const data = JSON.parse(response.getContentText());
    const users = data.users || data.data || [];
    
    Logger.log(`✅ ${users.length} 人のユーザーを取得しました`);
    
    // スプレッドシートに書き込み
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('ユーザー情報');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet('ユーザー情報');
    }
    
    // シートをクリア
    sheet.clear();
    
    // ヘッダー行を設定
    const headers = ['ID', '名前', 'メールアドレス', '部署', 'Talknote User ID', '最終更新日時'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    
    // データを書き込み
    if (users.length > 0) {
      const rows = users.map((user, index) => [
        index + 1,                           // ID (連番)
        user.name || user.display_name || '',// 名前
        user.email || '',                    // メールアドレス
        user.department || user.organization || '', // 部署
        user.id || '',                       // Talknote User ID
        new Date().toLocaleString('ja-JP')   // 最終更新日時
      ]);
      
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      
      // 交互に背景色を設定
      for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 0) {
          sheet.getRange(i + 2, 1, 1, headers.length).setBackground('#f8f9fa');
        }
      }
    }
    
    // 列幅を自動調整
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // 枠線を追加
    const lastRow = Math.max(2, users.length + 1);
    sheet.getRange(1, 1, lastRow, headers.length).setBorder(true, true, true, true, true, true);
    
    Logger.log('✅ ユーザー情報の更新が完了しました');
    
  } catch (error) {
    Logger.log(`❌ エラーが発生しました: ${error.toString()}`);
  }
}

/**
 * グループ一覧を更新
 */
function updateGroups() {
  const token = getAccessToken();
  
  if (!token) {
    Logger.log('❌ アクセストークンが設定されていません。setAccessTokenManually() を実行してください。');
    return;
  }
  
  try {
    Logger.log('グループ一覧の取得を開始...');
    
    const url = 'https://eapi.talknote.com/api/v1/groups';
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      Logger.log(`❌ エラー: ステータスコード ${responseCode}`);
      Logger.log(`レスポンス: ${response.getContentText()}`);
      return;
    }
    
    const data = JSON.parse(response.getContentText());
    const groups = data.groups || data.data || [];
    
    Logger.log(`✅ ${groups.length} 個のグループを取得しました`);
    
    // スプレッドシートに書き込み
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('グループ一覧');
    
    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet('グループ一覧');
    }
    
    // シートをクリア
    sheet.clear();
    
    // ヘッダー行を設定
    const headers = ['Group ID', 'グループ名', '説明', 'メンバー数', '最終更新日時'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    
    // データを書き込み
    if (groups.length > 0) {
      const rows = groups.map(group => [
        group.id || '',                      // Group ID
        group.name || group.title || '',     // グループ名
        group.description || '',             // 説明
        group.member_count || group.members_count || 0, // メンバー数
        new Date().toLocaleString('ja-JP')   // 最終更新日時
      ]);
      
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      
      // 交互に背景色を設定
      for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 0) {
          sheet.getRange(i + 2, 1, 1, headers.length).setBackground('#f8f9fa');
        }
      }
    }
    
    // 列幅を自動調整
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // 枠線を追加
    const lastRow = Math.max(2, groups.length + 1);
    sheet.getRange(1, 1, lastRow, headers.length).setBorder(true, true, true, true, true, true);
    
    Logger.log('✅ グループ一覧の更新が完了しました');
    
  } catch (error) {
    Logger.log(`❌ エラーが発生しました: ${error.toString()}`);
  }
}

/**
 * 全データを更新（メイン関数）
 */
function updateAllData() {
  Logger.log('========================================');
  Logger.log('=== Talknote データ同期開始 ===');
  Logger.log('========================================');
  const startTime = new Date();
  
  // アクセストークンの確認
  if (!getAccessToken()) {
    Logger.log('❌ エラー: アクセストークンが設定されていません');
    Logger.log('setAccessTokenManually() を実行してアクセストークンを設定してください');
    return;
  }
  
  updateUsers();
  Utilities.sleep(1000); // 1秒待機（API制限対策）
  updateGroups();
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000;
  Logger.log('========================================');
  Logger.log(`=== データ同期完了（所要時間: ${duration}秒）===`);
  Logger.log('========================================');
}

/**
 * トリガーを設定（1時間ごとに自動実行）
 */
function setupTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllData') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('既存のトリガーを削除しました');
    }
  });
  
  // 新しいトリガーを作成（1時間ごと）
  ScriptApp.newTrigger('updateAllData')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log('✅ トリガーを設定しました（1時間ごとに実行）');
}

/**
 * トリガーを削除
 */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updateAllData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  Logger.log('✅ トリガーを削除しました');
}

/**
 * 手動実行用（テスト用）
 */
function runNow() {
  updateAllData();
}

/**
 * スクリプトの状態を確認
 */
function checkStatus() {
  Logger.log('========================================');
  Logger.log('=== スクリプト状態確認 ===');
  Logger.log('========================================');
  
  // アクセストークンの確認
  const token = getAccessToken();
  if (token) {
    Logger.log('✅ アクセストークン: 設定済み');
    Logger.log(`   トークン（最初の10文字）: ${token.substring(0, 10)}...`);
  } else {
    Logger.log('❌ アクセストークン: 未設定');
  }
  
  // スプレッドシートの確認
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log(`✅ スプレッドシート: ${ss.getName()}`);
  Logger.log(`   ID: ${SPREADSHEET_ID}`);
  
  // シートの確認
  const userSheet = ss.getSheetByName('ユーザー情報');
  const groupSheet = ss.getSheetByName('グループ一覧');
  
  if (userSheet) {
    const userCount = userSheet.getLastRow() - 1; // ヘッダー行を除く
    Logger.log(`✅ ユーザー情報シート: あり（${userCount}件）`);
  } else {
    Logger.log('❌ ユーザー情報シート: なし');
  }
  
  if (groupSheet) {
    const groupCount = groupSheet.getLastRow() - 1; // ヘッダー行を除く
    Logger.log(`✅ グループ一覧シート: あり（${groupCount}件）`);
  } else {
    Logger.log('❌ グループ一覧シート: なし');
  }
  
  // トリガーの確認
  const triggers = ScriptApp.getProjectTriggers();
  const updateTriggers = triggers.filter(t => t.getHandlerFunction() === 'updateAllData');
  
  if (updateTriggers.length > 0) {
    Logger.log(`✅ 自動更新トリガー: 設定済み（${updateTriggers.length}個）`);
  } else {
    Logger.log('❌ 自動更新トリガー: 未設定');
  }
  
  Logger.log('========================================');
}
