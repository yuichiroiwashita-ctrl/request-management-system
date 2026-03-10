// Google Apps Script: Talknote データを定期的に同期

// 設定
const TALKNOTE_ACCESS_TOKEN = 'YOUR_TALKNOTE_ACCESS_TOKEN'; // 管理者用トークン
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

// ユーザー情報を更新
function updateUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('ユーザー情報') || ss.insertSheet('ユーザー情報');
  
  // Talknote API からユーザー一覧を取得
  const url = 'https://eapi.talknote.com/api/v1/users';
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${TALKNOTE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const users = JSON.parse(response.getContentText()).users;
    
    // ヘッダー行を設定
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', '名前', 'メールアドレス', '部署', 'Talknote User ID', '最終更新日時']);
    }
    
    // 既存データをクリア（ヘッダー以外）
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).clearContent();
    }
    
    // データを追加
    users.forEach((user, index) => {
      sheet.appendRow([
        index + 1,
        user.name || '',
        user.email || '',
        user.department || '',
        user.id,
        new Date()
      ]);
    });
    
    Logger.log('ユーザー情報を更新しました: ' + users.length + '件');
  } catch (error) {
    Logger.log('エラー: ' + error.toString());
  }
}

// グループ（スレッド）一覧を更新
function updateGroups() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('グループ一覧') || ss.insertSheet('グループ一覧');
  
  // Talknote API からグループ一覧を取得
  const url = 'https://eapi.talknote.com/api/v1/groups';
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${TALKNOTE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const groups = JSON.parse(response.getContentText()).groups;
    
    // ヘッダー行を設定
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Group ID', 'グループ名', '説明', 'メンバー数', '最終更新日時']);
    }
    
    // 既存データをクリア（ヘッダー以外）
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).clearContent();
    }
    
    // データを追加
    groups.forEach(group => {
      sheet.appendRow([
        group.id,
        group.name || '',
        group.description || '',
        group.member_count || 0,
        new Date()
      ]);
    });
    
    Logger.log('グループ情報を更新しました: ' + groups.length + '件');
  } catch (error) {
    Logger.log('エラー: ' + error.toString());
  }
}

// すべてのデータを更新
function updateAllData() {
  updateUsers();
  updateGroups();
}

// トリガー設定（1時間ごとに自動実行）
function createTrigger() {
  ScriptApp.newTrigger('updateAllData')
    .timeBased()
    .everyHours(1)
    .create();
}
