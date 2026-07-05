/**
 * API Utility
 * Handles all HTTP requests to the backend
 */

const API_BASE_URL = 'http://localhost:3000/api';

class API {
  constructor() {
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Set token
   */
  setToken(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * Clear token
   */
  clearToken() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Get headers
   */
  getHeaders(isFormData = false) {
    const headers = {
      'Authorization': `Bearer ${this.token}`,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Make request
   */
  async request(method, endpoint, data = null, isFormData = false) {
    try {
      const options = {
        method,
        headers: this.getHeaders(isFormData),
      };

      if (data) {
        if (isFormData) {
          options.body = data;
        } else {
          options.body = JSON.stringify(data);
        }
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request(method, endpoint, data, isFormData);
        } else {
          // Redirect to login
          window.location.href = '/login.html';
          return null;
        }
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/users/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const result = await response.json();

      if (result.success) {
        this.setToken(result.data.token, result.data.refreshToken);
        return true;
      } else {
        this.clearToken();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearToken();
      return false;
    }
  }

  // ============ USER ENDPOINTS ============

  async register(userData) {
    return this.request('POST', '/users/register', userData);
  }

  async login(loginData) {
    return this.request('POST', '/users/login', loginData);
  }

  async logout() {
    return this.request('POST', '/users/logout');
  }

  async getProfile() {
    return this.request('GET', '/users/profile');
  }

  async updateProfile(profileData) {
    return this.request('PUT', '/users/profile', profileData);
  }

  async updateAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request('PUT', '/users/avatar', formData, true);
  }

  async changePassword(passwordData) {
    return this.request('PUT', '/users/change-password', passwordData);
  }

  async searchUsers(query) {
    return this.request('GET', `/users/search?query=${encodeURIComponent(query)}`);
  }

  async getUserById(userId) {
    return this.request('GET', `/users/${userId}`);
  }

  // ============ FRIEND ENDPOINTS ============

  async sendFriendRequest(recipientId) {
    return this.request('POST', '/friends/request/send', { recipientId });
  }

  async acceptFriendRequest(senderId) {
    return this.request('POST', '/friends/request/accept', { senderId });
  }

  async rejectFriendRequest(senderId) {
    return this.request('POST', '/friends/request/reject', { senderId });
  }

  async cancelFriendRequest(recipientId) {
    return this.request('POST', '/friends/request/cancel', { recipientId });
  }

  async removeFriend(friendId) {
    return this.request('POST', '/friends/remove', { friendId });
  }

  async getFriendsList() {
    return this.request('GET', '/friends/list');
  }

  async getFriendRequests() {
    return this.request('GET', '/friends/requests');
  }

  async getOnlineFriends() {
    return this.request('GET', '/friends/online');
  }

  // ============ MESSAGE ENDPOINTS ============

  async sendMessage(messageData, file = null) {
    if (file) {
      const formData = new FormData();
      formData.append('content', messageData.content || '');
      formData.append('recipientId', messageData.recipientId || '');
      formData.append('groupId', messageData.groupId || '');
      formData.append('messageType', messageData.messageType || 'text');
      formData.append('file', file);
      return this.request('POST', '/messages/send', formData, true);
    } else {
      return this.request('POST', '/messages/send', messageData);
    }
  }

  async getMessages(recipientId = null, groupId = null, page = 1, limit = 50) {
    let query = `?page=${page}&limit=${limit}`;
    if (recipientId) query += `&recipientId=${recipientId}`;
    if (groupId) query += `&groupId=${groupId}`;
    return this.request('GET', `/messages/get${query}`);
  }

  async editMessage(messageId, content) {
    return this.request('PUT', `/messages/${messageId}/edit`, { content });
  }

  async deleteMessage(messageId, deleteForEveryone = false) {
    return this.request('DELETE', `/messages/${messageId}/delete`, { deleteForEveryone });
  }

  async addReaction(messageId, emoji) {
    return this.request('POST', `/messages/${messageId}/reaction/add`, { emoji });
  }

  async removeReaction(messageId, emoji) {
    return this.request('POST', `/messages/${messageId}/reaction/remove`, { emoji });
  }

  async markAsSeen(messageId) {
    return this.request('POST', '/messages/mark-as-seen', { messageId });
  }

  async searchMessages(query, recipientId = null, groupId = null) {
    let queryStr = `?query=${encodeURIComponent(query)}`;
    if (recipientId) queryStr += `&recipientId=${recipientId}`;
    if (groupId) queryStr += `&groupId=${groupId}`;
    return this.request('GET', `/messages/search${queryStr}`);
  }

  // ============ GROUP ENDPOINTS ============

  async createGroup(groupData) {
    return this.request('POST', '/groups/create', groupData);
  }

  async getGroupDetails(groupId) {
    return this.request('GET', `/groups/${groupId}`);
  }

  async updateGroup(groupId, groupData) {
    return this.request('PUT', `/groups/${groupId}/update`, groupData);
  }

  async updateGroupAvatar(groupId, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.request('PUT', `/groups/${groupId}/avatar`, formData, true);
  }

  async addGroupMember(groupId, memberId) {
    return this.request('POST', `/groups/${groupId}/member/add`, { memberId });
  }

  async removeGroupMember(groupId, memberId) {
    return this.request('POST', `/groups/${groupId}/member/remove`, { memberId });
  }

  async leaveGroup(groupId) {
    return this.request('POST', `/groups/${groupId}/leave`);
  }

  async deleteGroup(groupId) {
    return this.request('DELETE', `/groups/${groupId}/delete`);
  }

  async addGroupAdmin(groupId, memberId) {
    return this.request('POST', `/groups/${groupId}/admin/add`, { memberId });
  }

  async removeGroupAdmin(groupId, adminId) {
    return this.request('POST', `/groups/${groupId}/admin/remove`, { adminId });
  }

  async transferGroupOwnership(groupId, newOwnerId) {
    return this.request('POST', `/groups/${groupId}/transfer-ownership`, { newOwnerId });
  }

  async getUserGroups() {
    return this.request('GET', '/groups/user/groups');
  }

  // ============ NOTIFICATION ENDPOINTS ============

  async getNotifications(page = 1, limit = 20) {
    return this.request('GET', `/notifications?page=${page}&limit=${limit}`);
  }

  async getUnreadNotificationsCount() {
    return this.request('GET', '/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId) {
    return this.request('PUT', `/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.request('PUT', '/notifications/mark-all-as-read');
  }

  async deleteNotification(notificationId) {
    return this.request('DELETE', `/notifications/${notificationId}`);
  }

  async deleteAllNotifications() {
    return this.request('DELETE', '/notifications');
  }
}

// Create global API instance
const api = new API();
