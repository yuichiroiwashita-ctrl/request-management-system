// Google スプレッドシート連携モジュール（CSV Export API 使用）
const axios = require('axios');

class GoogleSheetsService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    // 実際のシートGID
    this.sheetGids = {
      'メンバー一覧': 151225421,
      'グループ一覧': 1212877788
    };
  }

  // 初期化（シートのGIDを取得）
  async init() {
    try {
      console.log('📊 Initializing Google Sheets Service...');
      console.log('   Spreadsheet ID:', this.spreadsheetId);

      // スプレッドシートのメタデータを取得してGIDを見つける
      // 注: 公開スプレッドシートの場合、デフォルトのGIDを使用
      // メンバー一覧が最初のシート（gid=0）と仮定
      // グループ一覧が2番目のシート（gid=適切な値）と仮定

      console.log('✅ Google Sheets Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets Service:', error.message);
      throw error;
    }
  }

  // CSV形式でシートデータを取得
  async fetchSheetAsCSV(gid = 0) {
    const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=${gid}`;

    try {
      const response = await axios.get(url);
      return this.parseCSV(response.data);
    } catch (error) {
      console.error(`❌ Failed to fetch sheet (gid=${gid}):`, error.message);
      throw error;
    }
  }

  // CSV文字列をパース
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      rows.push(row);
    }

    return rows;
  }

  // CSV行をパース（カンマとクォートを正しく処理）
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // ユーザー一覧を取得
  async getUsers() {
    try {
      console.log('📥 Fetching users from Google Sheets...');

      // メンバー一覧シート（gid=151225421）
      const rows = await this.fetchSheetAsCSV(this.sheetGids['メンバー一覧']);

      console.log(`✅ Fetched ${rows.length} users from Google Sheets`);

      return rows.map((row, index) => ({
        id: String(index + 1), // 連番でIDを生成
        talknote_user_id: row['user_id'] || row['User ID'],
        employee_number: row['従業員番号'] || row['Employee Number'],
        name: row['名前'] || row['Name'],
        kana: row['カナ'] || row['Kana'],
        email: row['メール'] || row['Email'],
        department: row['部署'] || row['Department'],
        position: row['役職'] || row['Position'],
        employee_type: row['社員区分'] || row['Employee Type'],
        registration_date: row['登録日'] || row['Registration Date'],
        hire_date: row['入社日'] || row['Hire Date'],
        gender: row['性別'] || row['Gender'],
        last_access: row['最終アクセス日時'] || row['Last Access']
      }));
    } catch (error) {
      console.error('❌ Failed to fetch users:', error.message);
      throw new Error('Sheet "メンバー一覧" not found or not accessible');
    }
  }

  // グループ一覧を取得
  async getGroups() {
    try {
      console.log('📥 Fetching groups from Google Sheets...');

      // グループ一覧シート（gid=1212877788）
      const rows = await this.fetchSheetAsCSV(this.sheetGids['グループ一覧']);

      console.log(`✅ Fetched ${rows.length} groups from Google Sheets`);

      return rows.map(row => ({
        id: row['group_id'] || row['Group ID'],
        name: row['グループ名'] || row['Group Name'],
        description: row['説明'] || row['Description'],
        member_count: parseInt(row['メンバー数'] || row['Member Count']) || 0,
        created_at: row['作成日'] || row['Created Date'],
        updated_at: row['最終更新日時'] || row['Updated At']
      }));
    } catch (error) {
      console.error('❌ Failed to fetch groups:', error.message);
      throw new Error('Sheet "グループ一覧" not found or not accessible');
    }
  }

  // ユーザーIDで検索
  async getUserById(userId) {
    const users = await this.getUsers();
    return users.find(u => u.id === userId || u.id === String(userId));
  }

  // グループIDで検索
  async getGroupById(groupId) {
    const groups = await this.getGroups();
    return groups.find(g => g.id === groupId || g.id === String(groupId));
  }
}

module.exports = GoogleSheetsService;
