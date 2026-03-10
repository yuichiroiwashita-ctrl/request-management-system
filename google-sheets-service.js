// Google スプレッドシート連携モジュール
const { GoogleSpreadsheet } = require('google-spreadsheet');

class GoogleSheetsService {
  constructor(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    this.doc = null;
  }

  // 初期化（公開シートの場合は認証不要）
  async init() {
    this.doc = new GoogleSpreadsheet(this.spreadsheetId);
    await this.doc.loadInfo();
    console.log('📊 Google Spreadsheet loaded:', this.doc.title);
  }

  // ユーザー一覧を取得
  async getUsers() {
    if (!this.doc) await this.init();

    // 複数のシート名をサポート
    const sheet = this.doc.sheetsByTitle['メンバー一覧'] || this.doc.sheetsByTitle['ユーザー情報'];
    if (!sheet) {
      throw new Error('Sheet "メンバー一覧" or "ユーザー情報" not found');
    }

    const rows = await sheet.getRows();

    return rows.map((row, index) => ({
      id: String(index + 1), // 連番でIDを生成
      talknote_user_id: row.get('user_id'), // Talknote のユーザーID
      employee_number: row.get('従業員番号'),
      name: row.get('名前'),
      kana: row.get('カナ'),
      email: row.get('メール'),
      department: row.get('部署'),
      position: row.get('役職'),
      employee_type: row.get('社員区分'),
      registration_date: row.get('登録日'),
      hire_date: row.get('入社日'),
      gender: row.get('性別'),
      last_access: row.get('最終アクセス日時'),
      permissions: {
        invite_members: row.get('メンバー招待権限'),
        external_communication: row.get('社外コミュニケーション権限'),
        create_notes: row.get('ノート作成権限')
      }
    }));
  }

  // グループ一覧を取得
  async getGroups() {
    if (!this.doc) await this.init();

    const sheet = this.doc.sheetsByTitle['グループ一覧'];
    if (!sheet) {
      throw new Error('Sheet "グループ一覧" not found');
    }

    const rows = await sheet.getRows();

    return rows.map(row => ({
      id: row.get('group_id'), // Talknote のグループID
      name: row.get('グループ名'),
      description: row.get('説明'),
      member_count: row.get('メンバー数'),
      created_at: row.get('作成日'),
      updated_at: row.get('最終更新日時')
    }));
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
