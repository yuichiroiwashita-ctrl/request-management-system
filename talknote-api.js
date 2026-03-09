const axios = require('axios');

class TalknoteAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://eapi.talknote.com/api/v1';
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'X-TALKNOTE-OAUTH-TOKEN': this.accessToken,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Talknote API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // ユーザー情報取得
  async getCurrentUser() {
    return await this.request('GET', '/user');
  }

  // ユーザー一覧取得
  async getUsers() {
    return await this.request('GET', '/users');
  }

  // グループ一覧取得
  async getGroups() {
    return await this.request('GET', '/groups');
  }

  // グループ詳細取得
  async getGroup(groupId) {
    return await this.request('GET', `/group/${groupId}`);
  }

  // グループにメッセージ投稿
  async postMessage(groupId, message) {
    return await this.request('POST', `/group/post/${groupId}`, { message });
  }

  // タイムラインにメッセージ投稿
  async postToTimeline(message) {
    return await this.request('POST', '/timeline/post', { message });
  }
}

// OAuth関連のヘルパー関数
class TalknoteOAuth {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.authBaseURL = 'https://oauth.talknote.com/oauth';
  }

  // 認可URLを生成
  getAuthorizationURL(scopes = []) {
    const defaultScopes = [
      'talknote.timeline.read',
      'talknote.timeline.write',
      'talknote.group',
      'talknote.group.read',
      'talknote.group.write',
      'talknote.group.message.read',
      'talknote.group.message.write',
      'talknote.user.read',
      'talknote.user.write'
    ];

    const scopeString = (scopes.length > 0 ? scopes : defaultScopes).join(' ');
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopeString
    });

    return `${this.authBaseURL}/authorize?${params.toString()}`;
  }

  // 認可コードをアクセストークンに交換
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(`${this.authBaseURL}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code: code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw error;
    }
  }

  // リフレッシュトークンで新しいアクセストークンを取得
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.authBaseURL}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = { TalknoteAPI, TalknoteOAuth };
