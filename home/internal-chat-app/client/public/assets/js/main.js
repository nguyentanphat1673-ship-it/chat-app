// ===== GLOBAL STATE =====
const state = {
  currentUser: null,
  token: null,
  socket: null,
  currentChat: null, // { type: 'private' | 'group', id: userId/groupId, user/group: userData }
  friends: [],
  friendRequests: [],
  groups: [],
  messages: [],
  onlineUsers: [],
  typingUsers: {},
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    state.token = token;
    loadCurrentUser();
    initializeApp();
  } else {
    showAuthPage();
  }
});

// ===== API FUNCTIONS =====
const API_BASE = 'http://localhost:3000/api';

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (state.token) {
    options.headers['Authorization'] = `Bearer ${state.token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (response.status === 401) {
      logout();
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

async function loadCurrentUser() {
  // Assuming the user data is stored after login
  const userStr = localStorage.getItem('user');
  if (userStr) {
    state.currentUser = JSON.parse(userStr);
  }
}

async function registerUser(email, password) {
  const response = await apiCall('/auth/register', 'POST', { email, password });
  return response;
}

async function verifyOtp(email, otp) {
  const response = await apiCall('/auth/verify-otp', 'POST', { email, otp });
  if (response && response.token) {
    state.token = response.token;
    state.currentUser = response;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response));
  }
  return response;
}

async function loginUser(email, password) {
  const response = await apiCall('/auth/login', 'POST', { email, password });
  if (response && response.token) {
    state.token = response.token;
    state.currentUser = response;
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response));
  }
  return response;
}

async function searchUser(user_id) {
  return await apiCall(`/users/search/${user_id}`);
}

async function sendFriendRequest(user_id) {
  return await apiCall(`/users/friend-request/${user_id}`, 'POST');
}

async function acceptFriendRequest(user_id) {
  return await apiCall(`/users/friend-request/accept/${user_id}`, 'POST');
}

async function rejectFriendRequest(user_id) {
  return await apiCall(`/users/friend-request/reject/${user_id}`, 'POST');
}

async function getFriendRequests() {
  const response = await apiCall('/users/friend-requests');
  state.friendRequests = response || [];
  return state.friendRequests;
}

async function getFriends() {
  const response = await apiCall('/users/friends');
  state.friends = response || [];
  return state.friends;
}

async function getMessages(id) {
  return await apiCall(`/messages/${id}`);
}

async function createGroup(name, members = []) {
  return await apiCall('/groups', 'POST', { name, members });
}

async function getGroup(groupId) {
  return await apiCall(`/groups/${groupId}`);
}

async function updateGroup(groupId, data) {
  return await apiCall(`/groups/${groupId}`, 'PUT', data);
}

async function addMemberToGroup(groupId, user_id) {
  return await apiCall(`/groups/${groupId}/add-member`, 'POST', { user_id });
}

async function removeMemberFromGroup(groupId, user_id) {
  return await apiCall(`/groups/${groupId}/remove-member`, 'POST', { user_id });
}

async function leaveGroup(groupId) {
  return await apiCall(`/groups/${groupId}/leave`, 'POST');
}

// ===== SOCKET.IO FUNCTIONS =====
function initializeSocket() {
  state.socket = io('http://localhost:3000');

  state.socket.on('connect', () => {
    console.log('Socket connected');
    state.socket.emit('authenticate', state.token);
  });

  state.socket.on('auth_error', (error) => {
    console.error('Socket auth error:', error);
    logout();
  });

  state.socket.on('online_users', (users) => {
    state.onlineUsers = users;
    updateOnlineStatus();
  });

  state.socket.on('user_online', (userId) => {
    if (!state.onlineUsers.includes(userId)) {
      state.onlineUsers.push(userId);
    }
    updateOnlineStatus();
  });

  state.socket.on('user_offline', (userId) => {
    state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    updateOnlineStatus();
  });

  state.socket.on('new_message', (message) => {
    if (state.currentChat && 
        ((state.currentChat.type === 'private' && message.receiver && message.receiver._id === state.currentChat.id) ||
         (state.currentChat.type === 'group' && message.group && message.group._id === state.currentChat.id))) {
      state.messages.push(message);
      renderMessages();
    }
  });

  state.socket.on('typing', ({ senderId, senderUserId, groupId }) => {
    state.typingUsers[senderId] = senderUserId;
    updateTypingIndicator();
  });

  state.socket.on('stop_typing', ({ senderId }) => {
    delete state.typingUsers[senderId];
    updateTypingIndicator();
  });

  state.socket.on('message_seen', ({ messageId, seenBy }) => {
    const message = state.messages.find(m => m._id === messageId);
    if (message && !message.seenBy.includes(seenBy)) {
      message.seenBy.push(seenBy);
      renderMessages();
    }
  });

  state.socket.on('error', (error) => {
    console.error('Socket error:', error);
    showNotification(error, 'error');
  });
}

// ===== UI RENDERING FUNCTIONS =====
function showAuthPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Internal Chat</h1>
        <p>Ứng dụng chat nội bộ chuyên nghiệp</p>
        <div id="auth-form"></div>
        <div class="auth-link">
          <span id="auth-toggle-text">Chưa có tài khoản? <a onclick="toggleAuthForm()">Đăng ký</a></span>
        </div>
      </div>
    </div>
  `;

  showLoginForm();
}

function showLoginForm() {
  const form = document.getElementById('auth-form');
  form.innerHTML = `
    <form onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" required>
      </div>
      <div class="form-group">
        <label>Mật khẩu</label>
        <input type="password" id="login-password" required>
      </div>
      <button type="submit" class="btn btn-primary">Đăng nhập</button>
    </form>
  `;
  document.getElementById('auth-toggle-text').innerHTML = 'Chưa có tài khoản? <a onclick="toggleAuthForm()">Đăng ký</a>';
}

function showRegisterForm() {
  const form = document.getElementById('auth-form');
  form.innerHTML = `
    <form onsubmit="handleRegister(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="register-email" required>
      </div>
      <div class="form-group">
        <label>Mật khẩu</label>
        <input type="password" id="register-password" required>
      </div>
      <button type="submit" class="btn btn-primary">Gửi OTP</button>
    </form>
  `;
  document.getElementById('auth-toggle-text').innerHTML = 'Đã có tài khoản? <a onclick="toggleAuthForm()">Đăng nhập</a>';
}

function showOtpForm(email) {
  const form = document.getElementById('auth-form');
  form.innerHTML = `
    <div>
      <p style="margin-bottom: 16px; font-size: 14px;">Mã OTP đã được gửi đến <strong>${email}</strong></p>
      <div class="form-group">
        <label>Mã OTP (6 số)</label>
        <input type="text" id="otp-input" maxlength="6" placeholder="000000" required>
      </div>
      <div class="otp-timer" id="otp-timer"></div>
      <button type="button" onclick="handleOtpVerification('${email}')" class="btn btn-primary">Xác thực OTP</button>
      <button type="button" onclick="handleResendOtp('${email}')" class="btn btn-secondary" style="margin-top: 8px;">Gửi lại OTP</button>
    </div>
  `;
  startOtpTimer();
}

function toggleAuthForm() {
  const form = document.getElementById('auth-form');
  if (form.innerHTML.includes('login-email')) {
    showRegisterForm();
  } else if (form.innerHTML.includes('register-email')) {
    showLoginForm();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const response = await loginUser(email, password);
  if (response && response.token) {
    initializeApp();
  } else {
    showNotification('Đăng nhập thất bại', 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  const response = await registerUser(email, password);
  if (response && response.message) {
    showOtpForm(email);
  } else {
    showNotification('Đăng ký thất bại', 'error');
  }
}

async function handleOtpVerification(email) {
  const otp = document.getElementById('otp-input').value;
  if (otp.length !== 6) {
    showNotification('Vui lòng nhập 6 chữ số', 'error');
    return;
  }

  const response = await verifyOtp(email, otp);
  if (response && response.token) {
    initializeApp();
  } else {
    showNotification('Xác thực OTP thất bại', 'error');
  }
}

async function handleResendOtp(email) {
  const response = await registerUser(email, '');
  if (response && response.message) {
    showNotification('OTP đã được gửi lại', 'success');
    startOtpTimer();
  } else {
    showNotification('Gửi lại OTP thất bại', 'error');
  }
}

function startOtpTimer() {
  let seconds = 300; // 5 minutes
  const timerEl = document.getElementById('otp-timer');
  const resendBtn = document.querySelector('button[onclick*="handleResendOtp"]');

  const interval = setInterval(() => {
    seconds--;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerEl.textContent = `OTP hết hạn trong: ${mins}:${secs.toString().padStart(2, '0')}`;
    timerEl.classList.add('active');

    if (seconds <= 0) {
      clearInterval(interval);
      timerEl.textContent = 'OTP đã hết hạn';
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

function initializeApp() {
  renderMainLayout();
  initializeSocket();
  loadInitialData();
}

function renderMainLayout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="chat-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>Chat</h2>
          <div class="sidebar-menu">
            <button onclick="showAddFriendModal()" title="Thêm bạn">➕</button>
            <button onclick="showCreateGroupModal()" title="Tạo nhóm">👥</button>
            <button onclick="logout()" title="Đăng xuất">🚪</button>
          </div>
        </div>
        <div class="sidebar-content">
          <div class="search-box">
            <input type="text" id="search-input" placeholder="Tìm kiếm...">
          </div>
          <div id="sidebar-list"></div>
        </div>
      </div>
      <div class="main-content">
        <div class="chat-header" id="chat-header"></div>
        <div class="messages-container" id="messages-container"></div>
        <div class="input-area">
          <div class="input-wrapper">
            <button class="input-actions" onclick="triggerFileUpload('image')">🖼️</button>
            <button class="input-actions" onclick="triggerFileUpload('video')">🎥</button>
            <textarea class="message-input" id="message-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
          </div>
          <button class="send-btn" onclick="sendMessage()">Gửi</button>
        </div>
      </div>
    </div>
    <input type="file" id="file-upload" style="display: none;" onchange="handleFileUpload(event)">
    <div id="add-friend-modal" class="modal"></div>
    <div id="create-group-modal" class="modal"></div>
    <div id="notification" style="position: fixed; top: 20px; right: 20px; padding: 16px 24px; background-color: #4ade80; color: white; border-radius: 8px; display: none; z-index: 2000;"></div>
  `;

  renderSidebar();
  renderChatHeader();
}

async function loadInitialData() {
  await getFriends();
  await getFriendRequests();
  renderSidebar();
}

function renderSidebar() {
  const sidebarList = document.getElementById('sidebar-list');
  let html = '';

  // Friend Requests Section
  if (state.friendRequests.length > 0) {
    html += `<div class="nav-section">
      <div class="nav-section-title">Lời mời kết bạn (${state.friendRequests.length})</div>`;
    state.friendRequests.forEach(request => {
      html += `
        <div class="nav-item">
          <div class="nav-item-avatar">${request.user_id.charAt(0).toUpperCase()}</div>
          <div class="nav-item-info">
            <div class="nav-item-name">${request.user_id}</div>
            <div style="font-size: 12px; color: rgba(255,255,255,0.6);">
              <button onclick="acceptFriendReq('${request._id}')" style="background: none; border: none; color: #4ade80; cursor: pointer; margin-right: 8px;">✓</button>
              <button onclick="rejectFriendReq('${request._id}')" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  // Friends Section
  if (state.friends.length > 0) {
    html += `<div class="nav-section">
      <div class="nav-section-title">Bạn bè (${state.friends.length})</div>`;
    state.friends.forEach(friend => {
      const isOnline = state.onlineUsers.includes(friend._id);
      const isActive = state.currentChat && state.currentChat.type === 'private' && state.currentChat.id === friend._id;
      html += `
        <div class="nav-item ${isActive ? 'active' : ''}" onclick="selectChat('private', '${friend._id}', ${JSON.stringify(friend).replace(/"/g, '&quot;')})">
          <div class="nav-item-avatar">${friend.user_id.charAt(0).toUpperCase()}</div>
          <div class="nav-item-info">
            <div class="nav-item-name">${friend.user_id}</div>
            <div class="nav-item-status">${isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</div>
          </div>
          ${isOnline ? '<div class="online-indicator"></div>' : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  // Groups Section
  if (state.groups.length > 0) {
    html += `<div class="nav-section">
      <div class="nav-section-title">Nhóm (${state.groups.length})</div>`;
    state.groups.forEach(group => {
      const isActive = state.currentChat && state.currentChat.type === 'group' && state.currentChat.id === group._id;
      html += `
        <div class="nav-item ${isActive ? 'active' : ''}" onclick="selectChat('group', '${group._id}', ${JSON.stringify(group).replace(/"/g, '&quot;')})">
          <div class="nav-item-avatar">${group.name.charAt(0).toUpperCase()}</div>
          <div class="nav-item-info">
            <div class="nav-item-name">${group.name}</div>
            <div class="nav-item-status">${group.members.length} thành viên</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  sidebarList.innerHTML = html;
}

function renderChatHeader() {
  const header = document.getElementById('chat-header');
  if (!state.currentChat) {
    header.innerHTML = '<p style="color: #999;">Chọn một cuộc trò chuyện để bắt đầu</p>';
    return;
  }

  const isOnline = state.currentChat.type === 'private' && state.onlineUsers.includes(state.currentChat.id);
  const title = state.currentChat.type === 'private' ? state.currentChat.user.user_id : state.currentChat.group.name;
  const status = state.currentChat.type === 'private' ? (isOnline ? 'Đang hoạt động' : 'Ngoại tuyến') : `${state.currentChat.group.members.length} thành viên`;

  header.innerHTML = `
    <div class="chat-header-info">
      <div class="chat-header-avatar">${title.charAt(0).toUpperCase()}</div>
      <div class="chat-header-title">
        <h3>${title}</h3>
        <p>${status}</p>
      </div>
    </div>
    <div class="chat-header-actions">
      <button onclick="showChatOptions()">⋮</button>
    </div>
  `;
}

async function selectChat(type, id, data) {
  state.currentChat = { type, id, [type === 'private' ? 'user' : 'group']: data };
  renderChatHeader();

  // Load messages
  const messages = await getMessages(id);
  state.messages = messages || [];
  renderMessages();

  // Scroll to bottom
  setTimeout(() => {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  }, 100);
}

function renderMessages() {
  const container = document.getElementById('messages-container');
  let html = '';

  state.messages.forEach(msg => {
    const isOwn = msg.sender._id === state.currentUser._id;
    const time = new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isSeen = msg.seenBy && msg.seenBy.some(id => id === state.currentUser._id);

    html += `<div class="message ${isOwn ? 'own' : ''}">`;
    html += `<div class="message-content">`;

    if (msg.file) {
      const isImage = msg.fileType === 'image';
      html += `<div class="message-media">
        ${isImage ? `<img src="${msg.file}" alt="Image">` : `<video controls><source src="${msg.file}"></video>`}
      </div>`;
    }

    if (msg.content) {
      html += `<div class="message-bubble">${escapeHtml(msg.content)}</div>`;
    }

    html += `</div>`;
    html += `<div class="message-time">${time}${isOwn && isSeen ? ' ✓✓' : ''}</div>`;
    html += `</div>`;
  });

  // Add typing indicator
  if (Object.keys(state.typingUsers).length > 0) {
    html += `<div class="message">
      <div class="message-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function updateTypingIndicator() {
  renderMessages();
}

function updateOnlineStatus() {
  renderSidebar();
  renderChatHeader();
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();

  if (!content && !state.currentChat) {
    return;
  }

  if (!state.currentChat) {
    showNotification('Vui lòng chọn một cuộc trò chuyện', 'error');
    return;
  }

  if (state.currentChat.type === 'private') {
    state.socket.emit('private_message', {
      receiverId: state.currentChat.id,
      content,
      file: null,
      fileType: null,
    });
  } else if (state.currentChat.type === 'group') {
    state.socket.emit('group_message', {
      groupId: state.currentChat.id,
      content,
      file: null,
      fileType: null,
    });
  }

  input.value = '';
  input.style.height = 'auto';
}

function triggerFileUpload(type) {
  const fileInput = document.getElementById('file-upload');
  fileInput.dataset.type = type;
  fileInput.click();
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const type = event.target.dataset.type;
  const reader = new FileReader();

  reader.onload = (e) => {
    const base64 = e.target.result;
    if (state.currentChat.type === 'private') {
      state.socket.emit('private_message', {
        receiverId: state.currentChat.id,
        content: '',
        file: base64,
        fileType: type,
      });
    } else if (state.currentChat.type === 'group') {
      state.socket.emit('group_message', {
        groupId: state.currentChat.id,
        content: '',
        file: base64,
        fileType: type,
      });
    }
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function showAddFriendModal() {
  const modal = document.getElementById('add-friend-modal');
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Thêm bạn</h2>
        <button class="modal-close" onclick="closeModal('add-friend-modal')">✕</button>
      </div>
      <div class="form-group">
        <label>User ID</label>
        <input type="text" id="search-user-id" placeholder="Nhập user_id">
      </div>
      <div id="search-result"></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('add-friend-modal')">Hủy</button>
        <button class="btn btn-primary" onclick="searchAndAddFriend()">Tìm kiếm</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

async function searchAndAddFriend() {
  const user_id = document.getElementById('search-user-id').value.trim();
  if (!user_id) {
    showNotification('Vui lòng nhập user_id', 'error');
    return;
  }

  const user = await searchUser(user_id);
  const resultDiv = document.getElementById('search-result');

  if (user && user._id) {
    resultDiv.innerHTML = `
      <div style="margin: 16px 0; padding: 12px; background-color: var(--light-gray); border-radius: 8px;">
        <p><strong>${user.user_id}</strong></p>
        <p style="font-size: 12px; color: #666; margin-top: 4px;">${user.email}</p>
        <button class="btn btn-primary" style="margin-top: 12px;" onclick="sendFriendReq('${user._id}')">Gửi lời mời</button>
      </div>
    `;
  } else {
    resultDiv.innerHTML = '<p style="color: #ef4444; margin-top: 16px;">Không tìm thấy người dùng</p>';
  }
}

async function sendFriendReq(userId) {
  const user = await searchUser(userId);
  const response = await sendFriendRequest(user.user_id);
  if (response && response.message) {
    showNotification('Lời mời kết bạn đã được gửi', 'success');
    closeModal('add-friend-modal');
  } else {
    showNotification('Gửi lời mời thất bại', 'error');
  }
}

async function acceptFriendReq(userId) {
  const user = state.friendRequests.find(r => r._id === userId);
  const response = await acceptFriendRequest(user.user_id);
  if (response && response.message) {
    showNotification('Lời mời kết bạn đã được chấp nhận', 'success');
    await getFriendRequests();
    await getFriends();
    renderSidebar();
  } else {
    showNotification('Chấp nhận lời mời thất bại', 'error');
  }
}

async function rejectFriendReq(userId) {
  const user = state.friendRequests.find(r => r._id === userId);
  const response = await rejectFriendRequest(user.user_id);
  if (response && response.message) {
    showNotification('Lời mời kết bạn đã bị từ chối', 'success');
    await getFriendRequests();
    renderSidebar();
  } else {
    showNotification('Từ chối lời mời thất bại', 'error');
  }
}

function showCreateGroupModal() {
  const modal = document.getElementById('create-group-modal');
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Tạo nhóm</h2>
        <button class="modal-close" onclick="closeModal('create-group-modal')">✕</button>
      </div>
      <div class="form-group">
        <label>Tên nhóm</label>
        <input type="text" id="group-name" placeholder="Nhập tên nhóm">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal('create-group-modal')">Hủy</button>
        <button class="btn btn-primary" onclick="createNewGroup()">Tạo</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
}

async function createNewGroup() {
  const name = document.getElementById('group-name').value.trim();
  if (!name) {
    showNotification('Vui lòng nhập tên nhóm', 'error');
    return;
  }

  const response = await createGroup(name);
  if (response && response._id) {
    showNotification('Nhóm đã được tạo', 'success');
    state.groups.push(response);
    renderSidebar();
    closeModal('create-group-modal');
  } else {
    showNotification('Tạo nhóm thất bại', 'error');
  }
}

function showChatOptions() {
  // Placeholder for chat options menu
  console.log('Chat options');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('show');
}

function showNotification(message, type = 'info') {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.style.backgroundColor = type === 'error' ? '#ef4444' : type === 'success' ? '#4ade80' : '#3b82f6';
  notif.style.display = 'block';

  setTimeout(() => {
    notif.style.display = 'none';
  }, 3000);
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (state.socket) {
    state.socket.disconnect();
  }
  state.currentUser = null;
  state.token = null;
  showAuthPage();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-resize textarea
document.addEventListener('input', (e) => {
  if (e.target.id === 'message-input') {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  }
});

// Send message on Enter key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'message-input') {
    e.preventDefault();
    sendMessage();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(modal => {
      modal.classList.remove('show');
    });
  }
});
