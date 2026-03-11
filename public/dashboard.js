// ========================================
// グローバル状態管理
// ========================================

const state = {
  currentUser: null,
  requests: [],
  users: [],
  groups: [],
  currentTab: 'received',
  currentRequestId: null
};

// ========================================
// 初期化
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  await init();
  setupEventListeners();
});

async function init() {
  try {
    // ユーザー情報を取得
    const userResponse = await fetch('/api/user');
    if (!userResponse.ok) {
      window.location.href = '/';
      return;
    }
    state.currentUser = await userResponse.json();
    document.getElementById('username').textContent = state.currentUser.name;

    // 統計情報とリクエスト一覧を取得
    await Promise.all([
      loadStats(),
      loadRequests(),
      loadUsers(),
      loadGroups()
    ]);

    renderStats();
    renderRequests();
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// ========================================
// データ取得
// ========================================

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    state.stats = await response.json();
  } catch (error) {
    console.error('Stats load error:', error);
  }
}

async function loadRequests() {
  try {
    let endpoint = '/api/requests';

    // タブに応じてエンドポイントを変更
    switch (state.currentTab) {
      case 'sent':
        endpoint = '/api/requests/sent';
        break;
      case 'received':
        endpoint = '/api/requests/received';
        break;
      case 'all':
      default:
        endpoint = '/api/requests';
        break;
    }

    const response = await fetch(endpoint);
    state.requests = await response.json();
  } catch (error) {
    console.error('Requests load error:', error);
  }
}

async function loadUsers() {
  try {
    const response = await fetch('/api/users/list');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    state.users = await response.json();
    console.log('✅ Users loaded:', state.users.length);
  } catch (error) {
    console.error('Users load error:', error);
    state.users = []; // エラー時は空配列
  }
}

async function loadGroups() {
  try {
    const response = await fetch('/api/groups/list');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    state.groups = await response.json();
    console.log('✅ Groups loaded:', state.groups.length);
  } catch (error) {
    console.error('Groups load error:', error);
    state.groups = []; // エラー時は空配列
  }
}

// ========================================
// イベントリスナー設定
// ========================================

function setupEventListeners() {
  // タブ切り替え
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      state.currentTab = tab.dataset.tab;
      updateActiveTab();
      await loadRequests(); // データを再取得
      renderRequests();
    });
  });

  // 新規リクエスト作成ボタン
  document.getElementById('btn-new-request').addEventListener('click', openCreateRequestModal);

  // モーダルクローズボタン
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // キャンセルボタン
  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // リクエスト作成送信
  document.querySelector('[data-action="submit"]').addEventListener('click', submitCreateRequest);

  // 期日延長申請送信
  document.querySelector('[data-action="submit-extension"]').addEventListener('click', submitExtensionRequest);

  // モーダル外クリックで閉じる
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });
}

// ========================================
// UI更新
// ========================================

function updateActiveTab() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.dataset.tab === state.currentTab) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  const titles = {
    received: '受信したリクエスト',
    sent: '送信したリクエスト',
    all: 'すべてのリクエスト'
  };
  document.getElementById('section-title').textContent = titles[state.currentTab];
}

function renderStats() {
  const stats = state.stats || {};
  const statsHtml = `
    <div class="stat-card">
      <div class="stat-label">総リクエスト数</div>
      <div class="stat-value">${stats.total || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">承認待ち</div>
      <div class="stat-value">${stats.pending || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">期日内完了</div>
      <div class="stat-value">${stats.completed_on_time || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">期日超過</div>
      <div class="stat-value">${stats.completed_late || 0}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">延長申請中</div>
      <div class="stat-value">${stats.extension_requested || 0}</div>
    </div>
  `;
  document.getElementById('stats').innerHTML = statsHtml;
}

function renderRequests() {
  // API で既にフィルタリングされているので、ここでのフィルタリングは不要
  const filteredRequests = state.requests;

  const listEl = document.getElementById('requests-list');
  const emptyEl = document.getElementById('empty-state');

  if (filteredRequests.length === 0) {
    listEl.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    return;
  }

  listEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  listEl.innerHTML = filteredRequests.map(request => {
    const statusBadge = getStatusBadge(request);
    const extensionBadge = getExtensionBadge(request);
    const actions = getRequestActions(request);
    const deadlineWarning = getDeadlineWarning(request);

    return `
      <div class="request-card ${deadlineWarning ? 'request-card-warning' : ''}" data-request-id="${request.id}">
        <div class="request-card-header">
          <div class="request-title">${escapeHtml(request.title)}</div>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${deadlineWarning ? `<span class="badge badge-warning">${deadlineWarning}</span>` : ''}
            ${statusBadge}
            ${extensionBadge}
          </div>
        </div>
        <div class="request-meta">
          ${request.sender_name} → ${request.recipient_name} · 期日: ${formatDate(request.deadline)}
        </div>
        ${actions ? `<div class="request-actions">${actions}</div>` : ''}
      </div>
    `;
  }).join('');

  // カードクリックイベント
  listEl.querySelectorAll('.request-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const requestId = parseInt(card.dataset.requestId);
        openRequestDetailModal(requestId);
      }
    });
  });

  // アクションボタンイベント
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const requestId = parseInt(btn.dataset.requestId);

      if (action === 'request-extension') {
        openExtensionRequestModal(requestId);
      } else if (action === 'approve-extension' || action === 'reject-extension') {
        await handleExtensionResponse(requestId, action);
      } else if (action === 'change-status-in-progress') {
        await changeRequestStatus(requestId, 'in_progress');
      } else if (action === 'change-status-completed') {
        await changeRequestStatus(requestId, 'completed');
      }
    });
  });
}

function getStatusBadge(request) {
  const statusMap = {
    pending: { class: 'badge-pending', text: '未着手' },
    in_progress: { class: 'badge-in-progress', text: '進行中' },
    completed: { class: 'badge-completed', text: '完了' },
    accepted: { class: 'badge-accepted', text: '承認済み' },
    rejected: { class: 'badge-rejected', text: '却下' }
  };
  const status = statusMap[request.status] || statusMap.pending;
  return `<span class="badge ${status.class}">${status.text}</span>`;
}

// 期日警告を取得
function getDeadlineWarning(request) {
  if (request.status === 'completed') return null;

  const now = new Date();
  const deadline = new Date(request.deadline);
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  if (diffHours < 0) {
    return '⚠️ 期限超過';
  } else if (diffHours < 24) {
    return '🔴 期限間近';
  } else if (diffHours < 48) {
    return '🟡 期限接近';
  }

  return null;
}

// ステータス変更
async function changeRequestStatus(requestId, newStatus) {
  try {
    const response = await fetch(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update status');
    }

    // リクエスト一覧を再読み込み
    await loadRequests();
    renderRequests();

    // トースト通知（オプション）
    console.log('✅ Status updated successfully');
  } catch (error) {
    console.error('Status update error:', error);
    alert('ステータスの更新に失敗しました: ' + error.message);
  }
}

function getExtensionBadge(request) {
  if (!request.extension_status) return '';

  const extensionMap = {
    requested: { class: 'badge-extension-requested', text: '延長申請中' },
    approved: { class: 'badge-extension-approved', text: '延長承認' },
    rejected: { class: 'badge-extension-rejected', text: '延長却下' }
  };

  const ext = extensionMap[request.extension_status];
  return ext ? `<span class="badge ${ext.class}">${ext.text}</span>` : '';
}

function getRequestActions(request) {
  const isRecipient = request.recipient_id === state.currentUser.id;
  const isSender = request.sender_id === state.currentUser.id;
  const now = new Date();
  const deadline = new Date(request.deadline);
  const isBeforeDeadline = now < deadline;

  let actions = [];

  // 受信者のアクション（ステータス変更ボタン）
  if (isRecipient && request.status !== 'completed') {
    if (request.status === 'pending') {
      actions.push(`
        <button class="btn btn-sm btn-primary" data-action="change-status-in-progress" data-request-id="${request.id}">
          着手する（進行中）
        </button>
      `);
    } else if (request.status === 'in_progress') {
      actions.push(`
        <button class="btn btn-sm btn-success" data-action="change-status-completed" data-request-id="${request.id}">
          完了にする
        </button>
      `);
    }
  }

  // 期日延長申請ボタン（受信者、未完了、期日前、延長申請中でない）
  if (isRecipient && request.status !== 'completed' && isBeforeDeadline &&
    (!request.extension_status || request.extension_status === 'rejected')) {
    actions.push(`
      <button class="btn btn-sm btn-secondary" data-action="request-extension" data-request-id="${request.id}">
        期日延長を申請
      </button>
    `);
  }

  // 延長申請への回答ボタン（送信者、延長申請中）
  if (isSender && request.extension_status === 'requested') {
    actions.push(`
      <button class="btn btn-sm btn-primary" data-action="approve-extension" data-request-id="${request.id}">
        延長を承認
      </button>
      <button class="btn btn-sm btn-secondary" data-action="reject-extension" data-request-id="${request.id}">
        延長を却下
      </button>
    `);
  }

  return actions.join('');
}

// ========================================
// リクエスト作成モーダル
// ========================================

function openCreateRequestModal() {
  // ユーザーリストを設定
  const recipientSelect = document.getElementById('request-recipient');
  recipientSelect.innerHTML = '<option value="">選択してください</option>' +
    state.users.map(user => {
      if (user.id !== state.currentUser.id) {
        return `<option value="${user.id}" data-name="${escapeHtml(user.name)}">${escapeHtml(user.name)}</option>`;
      }
      return '';
    }).join('');

  // グループリストを設定
  const groupSelect = document.getElementById('request-group');
  groupSelect.innerHTML = '<option value="">選択してください</option>' +
    state.groups.map(group =>
      `<option value="${group.id}" data-name="${escapeHtml(group.name)}">${escapeHtml(group.name)}</option>`
    ).join('');

  // フォームをリセット
  document.getElementById('form-create-request').reset();

  showModal('modal-create-request');
}

async function submitCreateRequest() {
  const form = document.getElementById('form-create-request');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const recipientSelect = document.getElementById('request-recipient');
  const groupSelect = document.getElementById('request-group');

  const data = {
    title: document.getElementById('request-title').value,
    content: document.getElementById('request-content').value,
    deadline: document.getElementById('request-deadline').value,
    recipient_id: recipientSelect.value,
    recipient_name: recipientSelect.selectedOptions[0].dataset.name,
    talknote_group_id: groupSelect.value,
    talknote_group_name: groupSelect.selectedOptions[0].dataset.name
  };

  try {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      closeAllModals();
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert('リクエストを作成しました');
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Request creation error:', error);
    alert('リクエストの作成に失敗しました');
  }
}

// ========================================
// リクエスト詳細モーダル
// ========================================

async function openRequestDetailModal(requestId) {
  state.currentRequestId = requestId;
  const request = state.requests.find(r => r.id === requestId);
  if (!request) return;

  const isRecipient = request.recipient_id === state.currentUser.id;
  const isSender = request.sender_id === state.currentUser.id;

  // 期日延長申請履歴を取得
  let extensions = [];
  try {
    const response = await fetch(`/api/requests/${requestId}/extensions`);
    if (response.ok) {
      extensions = await response.json();
    }
  } catch (error) {
    console.error('Extension history load error:', error);
  }

  let html = `
    <div class="detail-section">
      <div class="detail-heading">リクエスト内容</div>
      <div class="detail-text">${escapeHtml(request.content)}</div>
    </div>

    <div class="detail-section">
      <div class="detail-heading">メタ情報</div>
      <div class="detail-meta">
        <div class="detail-meta-item">
          <span class="detail-meta-label">送信者:</span> ${escapeHtml(request.sender_name)}
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">受信者:</span> ${escapeHtml(request.recipient_name)}
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">作成日:</span> ${formatDateTime(request.created_at)}
        </div>
        <div class="detail-meta-item">
          <span class="detail-meta-label">期日:</span> ${formatDateTime(request.deadline)}
          ${request.extension_status === 'approved' ? ' <span class="badge badge-extension-approved">延長済み</span>' : ''}
        </div>
      </div>
    </div>
  `;

  // 回答フォーム（受信者、pending状態）
  if (isRecipient && request.status === 'pending') {
    html += `
      <div class="detail-section">
        <div class="detail-heading">回答</div>
        <div class="radio-group">
          <div class="radio-option">
            <input type="radio" name="response-type" value="yes" id="response-yes">
            <label for="response-yes">Yes（承認）</label>
          </div>
          <div class="radio-option">
            <input type="radio" name="response-type" value="conditional" id="response-conditional">
            <label for="response-conditional">条件付きYes</label>
          </div>
          <div class="radio-option">
            <input type="radio" name="response-type" value="no" id="response-no">
            <label for="response-no">No（却下）</label>
          </div>
        </div>
        <div class="form-group mt-3 hidden" id="condition-input-group">
          <label class="form-label">条件</label>
          <textarea class="form-textarea" id="response-condition" placeholder="条件を入力してください"></textarea>
        </div>
        <button class="btn btn-primary mt-3" onclick="submitResponse()">回答する</button>
      </div>
    `;
  }

  // 回答表示（pending以外）
  if (request.status !== 'pending') {
    const responseTypeMap = {
      yes: 'Yes（承認）',
      conditional: '条件付きYes',
      no: 'No（却下）'
    };
    html += `
      <div class="detail-section">
        <div class="detail-heading">回答</div>
        <div class="detail-text">${responseTypeMap[request.response_type] || '-'}</div>
        ${request.response_condition ? `<div class="detail-text mt-2"><strong>条件:</strong> ${escapeHtml(request.response_condition)}</div>` : ''}
      </div>
    `;
  }

  // 期日延長申請履歴
  if (extensions.length > 0) {
    html += `
      <div class="detail-section">
        <div class="detail-heading">期日延長申請履歴</div>
        ${extensions.map(ext => `
          <div class="detail-text mb-2" style="padding: 12px; background: #f9fafb; border-radius: 6px;">
            <div style="font-weight: 600;">希望新期日: ${formatDateTime(ext.new_deadline)}</div>
            <div style="margin-top: 4px;">理由: ${escapeHtml(ext.reason)}</div>
            <div style="margin-top: 4px; font-size: 13px; color: #6b7280;">
              申請日: ${formatDateTime(ext.created_at)} · 
              ステータス: ${ext.status === 'pending' ? '承認待ち' : ext.status === 'approved' ? '承認' : '却下'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 期日延長への回答フォーム（送信者、延長申請中）
  const pendingExtension = extensions.find(ext => ext.status === 'pending');
  if (isSender && pendingExtension) {
    html += `
      <div class="detail-section">
        <div class="detail-heading">期日延長申請への回答</div>
        <div class="detail-text mb-3" style="padding: 12px; background: #fef3c7; border-radius: 6px;">
          <div><strong>申請者:</strong> ${escapeHtml(request.recipient_name)}</div>
          <div><strong>現在の期日:</strong> ${formatDateTime(request.deadline)}</div>
          <div><strong>希望新期日:</strong> ${formatDateTime(pendingExtension.new_deadline)}</div>
          <div><strong>理由:</strong> ${escapeHtml(pendingExtension.reason)}</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" onclick="respondToExtension(${pendingExtension.id}, 'approve')">承認する</button>
          <button class="btn btn-secondary" onclick="respondToExtension(${pendingExtension.id}, 'reject')">却下する</button>
        </div>
      </div>
    `;
  }

  // 完了報告フォーム（受信者、accepted状態、延長申請中でない）
  if (isRecipient && request.status === 'accepted' && request.extension_status !== 'requested') {
    html += `
      <div class="detail-section">
        <div class="detail-heading">完了報告</div>
        <form id="form-completion">
          <div class="form-group">
            <label class="form-label">報告内容</label>
            <textarea class="form-textarea" id="completion-report" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">添付ファイル（オプション）</label>
            <input type="file" class="form-file" id="completion-file">
            <div class="form-help">最大10MB</div>
          </div>
          <button type="button" class="btn btn-primary" onclick="submitCompletion()">報告を提出</button>
        </form>
      </div>
    `;
  }

  // 完了報告表示（completed状態）
  if (request.status === 'completed') {
    html += `
      <div class="detail-section">
        <div class="detail-heading">完了報告</div>
        <div class="detail-meta mb-2">
          <div class="detail-meta-item">
            <span class="detail-meta-label">完了日時:</span> ${formatDateTime(request.completed_at)}
          </div>
          <div class="detail-meta-item">
            <span class="detail-meta-label">期日遵守:</span> 
            ${request.deadline_met ? '<span class="badge badge-completed">✅ 期日内完了</span>' : '<span class="badge badge-rejected">⚠️ 期日超過</span>'}
          </div>
        </div>
        <div class="detail-text">${escapeHtml(request.completion_report || '-')}</div>
        ${request.completion_file_path ? `<div class="mt-2"><a href="/uploads/${request.completion_file_path}" target="_blank" class="header-link">📎 添付ファイルを開く</a></div>` : ''}
      </div>
    `;
  }

  document.getElementById('request-detail-content').innerHTML = html;
  showModal('modal-request-detail');

  // 条件付きYesラジオボタンのイベント
  const conditionalRadio = document.getElementById('response-conditional');
  if (conditionalRadio) {
    document.querySelectorAll('input[name="response-type"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const conditionGroup = document.getElementById('condition-input-group');
        if (radio.value === 'conditional' && radio.checked) {
          conditionGroup.classList.remove('hidden');
        } else {
          conditionGroup.classList.add('hidden');
        }
      });
    });
  }
}

// ========================================
// 回答処理
// ========================================

window.submitResponse = async function () {
  const selectedType = document.querySelector('input[name="response-type"]:checked');
  if (!selectedType) {
    alert('回答を選択してください');
    return;
  }

  const responseType = selectedType.value;
  const condition = responseType === 'conditional' ? document.getElementById('response-condition').value : '';

  if (responseType === 'conditional' && !condition) {
    alert('条件を入力してください');
    return;
  }

  const status = responseType === 'no' ? 'rejected' : 'accepted';

  try {
    const response = await fetch(`/api/requests/${state.currentRequestId}/respond`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, response_type: responseType, response_condition: condition })
    });

    if (response.ok) {
      closeAllModals();
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert('回答を送信しました');
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Response submission error:', error);
    alert('回答の送信に失敗しました');
  }
};

// ========================================
// 完了報告処理
// ========================================

window.submitCompletion = async function () {
  const report = document.getElementById('completion-report').value;
  if (!report) {
    alert('報告内容を入力してください');
    return;
  }

  const fileInput = document.getElementById('completion-file');
  const formData = new FormData();
  formData.append('report', report);
  if (fileInput.files[0]) {
    formData.append('file', fileInput.files[0]);
  }

  try {
    const response = await fetch(`/api/requests/${state.currentRequestId}/complete`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      closeAllModals();
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert('完了報告を提出しました');
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Completion submission error:', error);
    alert('完了報告の提出に失敗しました');
  }
};

// ========================================
// 期日延長申請モーダル
// ========================================

function openExtensionRequestModal(requestId) {
  state.currentRequestId = requestId;
  const request = state.requests.find(r => r.id === requestId);
  if (!request) return;

  const infoHtml = `
    <div class="detail-meta-item">
      <span class="detail-meta-label">現在の期日:</span> ${formatDateTime(request.deadline)}
    </div>
  `;
  document.getElementById('extension-current-info').innerHTML = infoHtml;

  // フォームをリセット
  document.getElementById('form-extension-request').reset();

  showModal('modal-extension-request');
}

async function submitExtensionRequest() {
  const form = document.getElementById('form-extension-request');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    new_deadline: document.getElementById('extension-new-deadline').value,
    reason: document.getElementById('extension-reason').value
  };

  try {
    const response = await fetch(`/api/requests/${state.currentRequestId}/extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      closeAllModals();
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert('期日延長申請を送信しました');
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Extension request submission error:', error);
    alert('期日延長申請の送信に失敗しました');
  }
}

// ========================================
// 期日延長への回答処理
// ========================================

async function handleExtensionResponse(requestId, action) {
  const actionText = action === 'approve-extension' ? '承認' : '却下';
  if (!confirm(`本当に延長申請を${actionText}しますか？`)) {
    return;
  }

  try {
    // まず延長申請を取得
    const extResponse = await fetch(`/api/requests/${requestId}/extensions`);
    const extensions = await extResponse.json();
    const pendingExtension = extensions.find(ext => ext.status === 'pending');

    if (!pendingExtension) {
      alert('延長申請が見つかりません');
      return;
    }

    const actionType = action === 'approve-extension' ? 'approve' : 'reject';
    const response = await fetch(`/api/requests/${requestId}/extension/${pendingExtension.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionType })
    });

    if (response.ok) {
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert(`延長申請を${actionText}しました`);
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Extension response error:', error);
    alert(`延長申請の${actionText}に失敗しました`);
  }
}

window.respondToExtension = async function (extensionId, action) {
  const actionText = action === 'approve' ? '承認' : '却下';
  if (!confirm(`本当に延長申請を${actionText}しますか？`)) {
    return;
  }

  try {
    const response = await fetch(`/api/requests/${state.currentRequestId}/extension/${extensionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (response.ok) {
      closeAllModals();
      await loadRequests();
      await loadStats();
      renderStats();
      renderRequests();
      alert(`延長申請を${actionText}しました`);
    } else {
      const error = await response.json();
      alert('エラー: ' + error.message);
    }
  } catch (error) {
    console.error('Extension response error:', error);
    alert(`延長申請の${actionText}に失敗しました`);
  }
};

// ========================================
// ユーティリティ関数
// ========================================

function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('show');
  });
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
