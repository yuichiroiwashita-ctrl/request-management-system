const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'requests.db'), (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('✅ Connected to SQLite database');
        this.initialize();
      }
    });
  }

  initialize() {
    this.db.serialize(() => {
      // ユーザーテーブル
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          avatar_url TEXT,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // リクエストテーブル
      this.db.run(`
        CREATE TABLE IF NOT EXISTS requests (
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
          extension_status TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (recipient_id) REFERENCES users(id)
        )
      `);

      // 期日延長申請テーブル
      this.db.run(`
        CREATE TABLE IF NOT EXISTS extension_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          request_id INTEGER NOT NULL,
          requester_id TEXT NOT NULL,
          new_deadline DATETIME NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          responded_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES requests(id),
          FOREIGN KEY (requester_id) REFERENCES users(id)
        )
      `);

      console.log('✅ Database tables initialized');
    });
  }

  // ユーザー操作
  saveUser(user) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO users (id, name, email, avatar_url, access_token, refresh_token, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      // null を空文字列に変換（NOT NULL 制約対策）
      const params = [
        user.id,
        user.name,
        user.email,
        user.avatar_url || '',
        user.access_token || '',
        user.refresh_token || ''
      ];

      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(user);
      });
    });
  }

  getUserById(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // リクエスト操作
  createRequest(request) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO requests (
          title, content, deadline, sender_id, sender_name, 
          recipient_id, recipient_name, talknote_group_id, talknote_group_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        request.title,
        request.content,
        request.deadline,
        request.sender_id,
        request.sender_name,
        request.recipient_id,
        request.recipient_name,
        request.talknote_group_id,
        request.talknote_group_name
      ], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getRequestById(requestId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM requests WHERE id = ?', [requestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  getRequestsByUser(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM requests 
        WHERE sender_id = ? OR recipient_id = ?
        ORDER BY created_at DESC
      `;
      this.db.all(sql, [userId, userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  updateRequestStatus(requestId, status, responseData = {}) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE requests 
        SET status = ?, response_type = ?, response_condition = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [status, responseData.response_type, responseData.response_condition, requestId], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  completeRequest(requestId, completionData) {
    return new Promise((resolve, reject) => {
      const deadlineMet = new Date(completionData.completed_at) <= new Date(completionData.deadline);
      const sql = `
        UPDATE requests 
        SET status = 'completed', 
            completion_report = ?, 
            completion_file_path = ?,
            completed_at = ?,
            deadline_met = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      this.db.run(sql, [
        completionData.report,
        completionData.file_path,
        completionData.completed_at,
        deadlineMet,
        requestId
      ], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // 期日延長申請操作
  createExtensionRequest(extensionData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO extension_requests (request_id, requester_id, new_deadline, reason)
        VALUES (?, ?, ?, ?)
      `;
      this.db.run(sql, [
        extensionData.request_id,
        extensionData.requester_id,
        extensionData.new_deadline,
        extensionData.reason
      ], function (err) {
        if (err) reject(err);
        else {
          // リクエストのextension_statusを更新
          const updateSql = `
            UPDATE requests 
            SET extension_status = 'requested', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          this.run(updateSql, [extensionData.request_id], (updateErr) => {
            if (updateErr) reject(updateErr);
            else resolve(this.lastID);
          });
        }
      });
    });
  }

  getExtensionRequestsByRequestId(requestId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM extension_requests 
        WHERE request_id = ?
        ORDER BY created_at DESC
      `;
      this.db.all(sql, [requestId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  getPendingExtensionRequest(requestId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM extension_requests 
        WHERE request_id = ? AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      this.db.get(sql, [requestId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  respondToExtensionRequest(extensionId, action) {
    return new Promise((resolve, reject) => {
      // まず延長申請を取得
      this.db.get('SELECT * FROM extension_requests WHERE id = ?', [extensionId], (err, extension) => {
        if (err) {
          reject(err);
          return;
        }
        if (!extension) {
          reject(new Error('Extension request not found'));
          return;
        }

        const status = action === 'approve' ? 'approved' : 'rejected';
        const extensionStatus = action === 'approve' ? 'approved' : 'rejected';

        // 延長申請のステータスを更新
        const updateExtensionSql = `
          UPDATE extension_requests 
          SET status = ?, responded_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        this.db.run(updateExtensionSql, [status, extensionId], (err) => {
          if (err) {
            reject(err);
            return;
          }

          // リクエストのextension_statusを更新し、承認の場合はdeadlineも更新
          let updateRequestSql;
          let params;

          if (action === 'approve') {
            updateRequestSql = `
              UPDATE requests 
              SET extension_status = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            params = [extensionStatus, extension.new_deadline, extension.request_id];
          } else {
            updateRequestSql = `
              UPDATE requests 
              SET extension_status = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            params = [extensionStatus, extension.request_id];
          }

          this.db.run(updateRequestSql, params, function (err) {
            if (err) reject(err);
            else resolve({ extension, changes: this.changes });
          });
        });
      });
    });
  }

  // 統計情報
  getStats(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
          SUM(CASE WHEN status = 'completed' AND deadline_met = 1 THEN 1 ELSE 0 END) as completed_on_time,
          SUM(CASE WHEN status = 'completed' AND deadline_met = 0 THEN 1 ELSE 0 END) as completed_late,
          SUM(CASE WHEN extension_status = 'requested' THEN 1 ELSE 0 END) as extension_requested
        FROM requests
        WHERE sender_id = ? OR recipient_id = ?
      `;
      this.db.get(sql, [userId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
