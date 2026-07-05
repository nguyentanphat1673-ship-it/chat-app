/**
 * Main Application
 * Handles app initialization and routing
 */

class ChatApp {
  constructor() {
    this.currentUser = null;
    this.currentConversation = null;
    this.conversations = [];
    this.friends = [];
    this.groups = [];
    this.notifications = [];
    this.isLoggedIn = false;
    this.typingUsers = new Set();
    this.init();
  }

  /**
   * Initialize application
   */
  async init() {
    console.log('Initializing Chat App...');

    // Check if user is logged in
    const token = localStorage.getItem('token');

    if (!token) {
      this.showLoginPage();
    } else {
      try {
        // Get user profile
        const response = await api.getProfile();
        if (response.success) {
          this.currentUser = response.data;
          this.isLoggedIn = true;

          // Initialize socket
          socket.connect(this.currentUser._id);

          // Setup socket listeners
          this.setupSocketListeners();

          // Load conversations and friends
          await this.loadConversations();
          await this.loadFriends();
          await this.loadGroups();

          // Render main chat page
          this.renderChatPage();

          // Load notifications
          this.loadNotifications();
        } else {
          this.showLoginPage();
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        this.showLoginPage();
      }
    }
  }

  /**
   * Show login page
   */
  showLoginPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container">
        <div class="login-box">
          <div class="login-header">
            <h1 style="color: var(--primary-color); font-size: 32px; margin-bottom: 8px;">
              <i class="fas fa-comments"></i> Chat App
            </h1>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Modern Internal Chat Platform</p>
          </div>

          <div class="tabs">
            <button class="tab-btn active" data-tab="login">Login</button>
            <button class="tab-btn" data-tab="register">Register</button>
          </div>

          <!-- Login Form -->
          <form id="loginForm" class="tab-content active" data-tab="login">
            <div class="form-group">
              <label>Email, Phone, or User ID</label>
              <input type="text" id="loginInput" placeholder="Enter email, phone, or user ID" required>
            </div>

            <div class="form-group">
              <label>Password</label>
              <input type="password" id="loginPassword" placeholder="Enter password" required>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="rememberMe"> Remember me
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full">
              <i class="fas fa-sign-in-alt"></i> Login
            </button>
          </form>

          <!-- Register Form -->
          <form id="registerForm" class="tab-content" data-tab="register">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="registerName" placeholder="Enter full name" required>
            </div>

            <div class="form-group">
              <label>Display Name</label>
              <input type="text" id="registerDisplayName" placeholder="Enter display name" required>
            </div>

            <div class="form-group">
              <label>Email</label>
              <input type="email" id="registerEmail" placeholder="Enter email" required>
            </div>

            <div class="form-group">
              <label>Phone (Optional)</label>
              <input type="tel" id="registerPhone" placeholder="Enter phone number">
            </div>

            <div class="form-group">
              <label>Date of Birth</label>
              <input type="date" id="registerDOB" required>
            </div>

            <div class="form-group">
              <label>Gender</label>
              <select id="registerGender" required>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label>Password</label>
              <input type="password" id="registerPassword" placeholder="Enter password" required>
            </div>

            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" id="registerConfirmPassword" placeholder="Confirm password" required>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full">
              <i class="fas fa-user-plus"></i> Register
            </button>
          </form>

          <div id="authMessage" style="margin-top: 16px; padding: 12px; border-radius: 8px; display: none;"></div>
        </div>
      </div>

      <style>
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, var(--primary-light) 0%, var(--bg-secondary) 100%);
        }

        .login-box {
          background-color: var(--bg-primary);
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
          padding: 32px;
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          background: none;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: var(--transition);
        }

        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .tab-content {
          display: none;
        }

        .tab-content.active {
          display: block;
          animation: fadeIn 0.3s ease;
        }

        .w-full {
          width: 100%;
        }

        #authMessage {
          text-align: center;
          font-size: 14px;
        }

        #authMessage.success {
          background-color: #d4edda;
          color: var(--secondary-color);
          border: 1px solid #c3e6cb;
        }

        #authMessage.error {
          background-color: #f8d7da;
          color: var(--danger-color);
          border: 1px solid #f5c6cb;
        }

        @media (max-width: 480px) {
          .login-box {
            padding: 24px;
          }
        }
      </style>
    `;

    // Setup event listeners
    this.setupAuthListeners();
  }

  /**
   * Setup authentication listeners
   */
  setupAuthListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
      });
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    // Register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleRegister();
    });
  }

  /**
   * Handle login
   */
  async handleLogin() {
    const login = document.getElementById('loginInput').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const messageDiv = document.getElementById('authMessage');

    try {
      const response = await api.login({ login, password, rememberMe });

      if (response.success) {
        api.setToken(response.data.token, response.data.refreshToken);
        this.currentUser = response.data.user;
        this.isLoggedIn = true;

        // Initialize socket
        socket.connect(this.currentUser._id);
        this.setupSocketListeners();

        // Load data and render
        await this.loadConversations();
        await this.loadFriends();
        await this.loadGroups();
        this.renderChatPage();
        this.loadNotifications();
      } else {
        this.showMessage(messageDiv, response.message, 'error');
      }
    } catch (error) {
      this.showMessage(messageDiv, error.message, 'error');
    }
  }

  /**
   * Handle register
   */
  async handleRegister() {
    const name = document.getElementById('registerName').value;
    const displayName = document.getElementById('registerDisplayName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const dateOfBirth = document.getElementById('registerDOB').value;
    const gender = document.getElementById('registerGender').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const messageDiv = document.getElementById('authMessage');

    try {
      const response = await api.register({
        name,
        displayName,
        email,
        phone: phone || undefined,
        dateOfBirth,
        gender,
        password,
        confirmPassword,
      });

      if (response.success) {
        api.setToken(response.data.token, response.data.refreshToken);
        this.currentUser = response.data.user;
        this.isLoggedIn = true;

        // Initialize socket
        socket.connect(this.currentUser._id);
        this.setupSocketListeners();

        // Load data and render
        await this.loadConversations();
        await this.loadFriends();
        await this.loadGroups();
        this.renderChatPage();
        this.loadNotifications();
      } else {
        this.showMessage(messageDiv, response.message, 'error');
      }
    } catch (error) {
      this.showMessage(messageDiv, error.message, 'error');
    }
  }

  /**
   * Show message
   */
  showMessage(element, message, type) {
    element.textContent = message;
    element.className = type;
    element.style.display = 'block';
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }

  /**
   * Load conversations
   */
  async loadConversations() {
    try {
      const response = await api.getFriendsList();
      if (response.success) {
        this.friends = response.data;
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  /**
   * Load friends
   */
  async loadFriends() {
    try {
      const response = await api.getFriendsList();
      if (response.success) {
        this.friends = response.data;
      }
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  }

  /**
   * Load groups
   */
  async loadGroups() {
    try {
      const response = await api.getUserGroups();
      if (response.success) {
        this.groups = response.data;
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  }

  /**
   * Load notifications
   */
  async loadNotifications() {
    try {
      const response = await api.getNotifications(1, 10);
      if (response.success) {
        this.notifications = response.data;
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Setup socket listeners
   */
  setupSocketListeners() {
    socket.onMessageReceived((data) => {
      console.log('Message received:', data);
      if (this.currentConversation) {
        this.addMessageToChat(data.message);
      }
    });

    socket.onUserStatusChanged((data) => {
      console.log('User status changed:', data);
      this.updateUserStatus(data.userId, data.isOnline);
    });

    socket.onUserTyping((data) => {
      this.typingUsers.add(data.userId);
      this.showTypingIndicator(data.displayName);
    });

    socket.onUserStoppedTyping((data) => {
      this.typingUsers.delete(data.userId);
      if (this.typingUsers.size === 0) {
        this.hideTypingIndicator();
      }
    });

    socket.onMessageSeen((data) => {
      this.updateMessageStatus(data.messageId, 'seen');
    });

    socket.onMessageDeleted((data) => {
      this.removeMessageFromChat(data.messageId);
    });

    socket.onMessageEdited((data) => {
      this.updateMessageContent(data.messageId, data.content);
    });

    socket.onReactionAdded((data) => {
      this.addReactionToMessage(data.messageId, data.emoji);
    });

    socket.onNewNotification((data) => {
      this.notifications.unshift(data);
      this.showNotificationAlert(data);
    });

    socket.onFriendRequestReceived((data) => {
      this.showNotificationAlert({
        type: 'friend_request',
        title: 'Friend Request',
        content: 'You have a new friend request',
      });
    });
  }

  /**
   * Render chat page
   */
  renderChatPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="chat-container">
        <!-- Sidebar -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h1>Chats</h1>
            <div class="sidebar-actions">
              <button class="icon-btn" id="newChatBtn" title="New Chat">
                <i class="fas fa-pen"></i>
              </button>
              <button class="icon-btn" id="notificationsBtn" title="Notifications">
                <i class="fas fa-bell"></i>
                <span id="notificationBadge" class="unread-badge" style="display: none;">0</span>
              </button>
              <button class="icon-btn" id="settingsBtn" title="Settings">
                <i class="fas fa-cog"></i>
              </button>
            </div>
          </div>

          <div class="search-bar">
            <input type="text" class="search-input" id="searchInput" placeholder="Search conversations...">
          </div>

          <div class="conversation-list" id="conversationList">
            <!-- Conversations will be loaded here -->
          </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area">
          <div id="chatContent" class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-comments"></i>
            </div>
            <div class="empty-state-text">
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        </div>
      </div>

      <style>
        .chat-container {
          display: flex;
          height: 100vh;
          background-color: var(--bg-primary);
        }

        .sidebar {
          width: 360px;
          background-color: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-primary);
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: 50%;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }

          .chat-area {
            height: 50%;
          }
        }

        @media (max-width: 480px) {
          .sidebar {
            display: none;
          }

          .chat-area {
            height: 100%;
          }

          .sidebar.mobile-visible {
            display: flex;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
          }
        }
      </style>
    `;

    // Load conversations
    this.loadConversationsList();

    // Setup event listeners
    this.setupChatPageListeners();
  }

  /**
   * Load conversations list
   */
  loadConversationsList() {
    const list = document.getElementById('conversationList');
    list.innerHTML = '';

    // Add friends as conversations
    this.friends.forEach((friend) => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="conversation-avatar">
          <img src="${friend.avatar || 'https://via.placeholder.com/48'}" alt="${friend.displayName}">
          ${friend.isOnline ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">${friend.displayName}</span>
            <span class="conversation-time">Now</span>
          </div>
          <div class="conversation-preview">${friend.userId}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectConversation(friend);
      });

      list.appendChild(item);
    });

    // Add groups
    this.groups.forEach((group) => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.innerHTML = `
        <div class="conversation-avatar">
          <img src="${group.avatar || 'https://via.placeholder.com/48'}" alt="${group.name}">
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">${group.name}</span>
            <span class="conversation-time">Now</span>
          </div>
          <div class="conversation-preview">${group.members.length} members</div>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectConversation(group, true);
      });

      list.appendChild(item);
    });
  }

  /**
   * Select conversation
   */
  selectConversation(conversation, isGroup = false) {
    this.currentConversation = conversation;

    // Update UI
    document.querySelectorAll('.conversation-item').forEach((item) => {
      item.classList.remove('active');
    });

    event.currentTarget.classList.add('active');

    // Render chat
    this.renderChat(conversation, isGroup);
  }

  /**
   * Render chat
   */
  async renderChat(conversation, isGroup = false) {
    const chatContent = document.getElementById('chatContent');
    chatContent.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-header-avatar">
            <img src="${conversation.avatar || 'https://via.placeholder.com/40'}" alt="${conversation.displayName || conversation.name}">
          </div>
          <div class="chat-header-details">
            <h3>${conversation.displayName || conversation.name}</h3>
            <div class="chat-header-status">
              ${isGroup ? `${conversation.members.length} members` : (conversation.isOnline ? 'Online' : 'Offline')}
            </div>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="icon-btn" title="Call">
            <i class="fas fa-phone"></i>
          </button>
          <button class="icon-btn" title="Video Call">
            <i class="fas fa-video"></i>
          </button>
          <button class="icon-btn" title="Info">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      </div>

      <div class="messages-container" id="messagesContainer">
        <!-- Messages will be loaded here -->
      </div>

      <div class="message-input-area">
        <div class="message-input-wrapper">
          <div class="input-actions">
            <button class="input-icon-btn" title="Attach file">
              <i class="fas fa-paperclip"></i>
            </button>
            <button class="input-icon-btn" title="Emoji">
              <i class="fas fa-smile"></i>
            </button>
          </div>
          <div class="input-field">
            <textarea id="messageInput" placeholder="Aa" rows="1"></textarea>
          </div>
          <button class="send-btn" id="sendBtn" title="Send">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      <style>
        .chat-header {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--bg-primary);
        }

        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .chat-header-avatar img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .chat-header-details h3 {
          margin: 0;
          font-size: 15px;
          color: var(--text-primary);
        }

        .chat-header-status {
          font-size: 12px;
          color: var(--text-light);
        }

        .chat-header-actions {
          display: flex;
          gap: 12px;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .message-input-area {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-primary);
        }

        .message-input-wrapper {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .input-actions {
          display: flex;
          gap: 4px;
        }

        .input-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: var(--primary-color);
          transition: var(--transition);
        }

        .input-icon-btn:hover {
          background-color: var(--bg-secondary);
          transform: scale(1.05);
        }

        .input-field {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background-color: var(--bg-secondary);
          border-radius: 20px;
          border: 1px solid var(--border-color);
        }

        .input-field textarea {
          flex: 1;
          border: none;
          background: transparent;
          resize: none;
          max-height: 100px;
          padding: 0;
          font-size: 14px;
          font-family: inherit;
          color: var(--text-primary);
        }

        .input-field textarea:focus {
          outline: none;
        }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--primary-color);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: var(--transition);
        }

        .send-btn:hover:not(:disabled) {
          background-color: var(--primary-dark);
          transform: scale(1.05);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      </style>
    `;

    // Load messages
    await this.loadMessages(conversation, isGroup);

    // Setup message input listeners
    this.setupMessageInputListeners(conversation, isGroup);
  }

  /**
   * Load messages
   */
  async loadMessages(conversation, isGroup = false) {
    try {
      const response = await api.getMessages(
        isGroup ? null : conversation._id,
        isGroup ? conversation._id : null,
        1,
        50
      );

      if (response.success) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        response.data.forEach((message) => {
          this.addMessageToChat(message);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  /**
   * Add message to chat
   */
  addMessageToChat(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const isOwnMessage = message.sender._id === this.currentUser._id;

    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${isOwnMessage ? 'own' : ''}`;
    messageGroup.dataset.messageId = message._id;

    let messageHTML = `
      ${!isOwnMessage ? `<img src="${message.sender.avatar}" class="message-avatar" alt="">` : ''}
      <div class="message-content">
        <div class="message-bubble ${isOwnMessage ? 'own' : 'other'}">
          ${message.content}
        </div>
        <div class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</div>
      </div>
    `;

    messageGroup.innerHTML = messageHTML;
    container.appendChild(messageGroup);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Setup message input listeners
   */
  setupMessageInputListeners(conversation, isGroup = false) {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Send on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(conversation, isGroup);
      }
    });

    // Send button
    sendBtn.addEventListener('click', () => {
      this.sendMessage(conversation, isGroup);
    });
  }

  /**
   * Send message
   */
  async sendMessage(conversation, isGroup = false) {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;

    try {
      const messageData = {
        content,
        recipientId: isGroup ? null : conversation._id,
        groupId: isGroup ? conversation._id : null,
        messageType: 'text',
      };

      const response = await api.sendMessage(messageData);

      if (response.success) {
        input.value = '';
        input.style.height = 'auto';

        // Emit socket event
        socket.sendMessage({
          messageId: response.data._id,
          recipientId: messageData.recipientId,
          groupId: messageData.groupId,
        });

        // Add message to chat
        this.addMessageToChat(response.data);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * Setup chat page listeners
   */
  setupChatPageListeners() {
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
      this.showNewChatDialog();
    });

    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.showSettingsDialog();
    });

    document.getElementById('notificationsBtn')?.addEventListener('click', () => {
      this.showNotificationsDialog();
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.filterConversations(e.target.value);
    });
  }

  /**
   * Show new chat dialog
   */
  showNewChatDialog() {
    alert('New chat dialog - To be implemented');
  }

  /**
   * Show settings dialog
   */
  showSettingsDialog() {
    alert('Settings dialog - To be implemented');
  }

  /**
   * Show notifications dialog
   */
  showNotificationsDialog() {
    alert('Notifications dialog - To be implemented');
  }

  /**
   * Filter conversations
   */
  filterConversations(query) {
    const items = document.querySelectorAll('.conversation-item');
    items.forEach((item) => {
      const name = item.querySelector('.conversation-name').textContent.toLowerCase();
      if (name.includes(query.toLowerCase())) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * Update user status
   */
  updateUserStatus(userId, isOnline) {
    // Update friend status
    const friend = this.friends.find((f) => f._id === userId);
    if (friend) {
      friend.isOnline = isOnline;
      this.loadConversationsList();
    }
  }

  /**
   * Add message to chat
   */
  addMessageToChat(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const isOwnMessage = message.sender._id === this.currentUser._id;

    const messageGroup = document.createElement('div');
    messageGroup.className = `message-group ${isOwnMessage ? 'own' : ''}`;
    messageGroup.dataset.messageId = message._id;

    let messageHTML = `
      ${!isOwnMessage ? `<img src="${message.sender.avatar}" class="message-avatar" alt="">` : ''}
      <div class="message-content">
        <div class="message-bubble ${isOwnMessage ? 'own' : 'other'}">
          ${message.content}
        </div>
        <div class="message-time">${new Date(message.createdAt).toLocaleTimeString()}</div>
      </div>
    `;

    messageGroup.innerHTML = messageHTML;
    container.appendChild(messageGroup);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator(displayName) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    let indicator = container.querySelector('.typing-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'message-group';
      indicator.innerHTML = `
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      `;
      container.appendChild(indicator);
    }

    container.scrollTop = container.scrollHeight;
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator() {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const indicator = container.querySelector('.typing-indicator');
    if (indicator) {
      indicator.parentElement.remove();
    }
  }

  /**
   * Update message status
   */
  updateMessageStatus(messageId, status) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
      const statusEl = message.querySelector('.message-status');
      if (statusEl) {
        statusEl.textContent = status;
      }
    }
  }

  /**
   * Remove message from chat
   */
  removeMessageFromChat(messageId) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
      message.remove();
    }
  }

  /**
   * Update message content
   */
  updateMessageContent(messageId, content) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
      const bubble = message.querySelector('.message-bubble');
      if (bubble) {
        bubble.textContent = content;
      }
    }
  }

  /**
   * Add reaction to message
   */
  addReactionToMessage(messageId, emoji) {
    const message = document.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
      let reactionsContainer = message.querySelector('.message-reactions');
      if (!reactionsContainer) {
        reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'message-reactions';
        message.querySelector('.message-content').appendChild(reactionsContainer);
      }

      const reaction = document.createElement('div');
      reaction.className = 'reaction';
      reaction.textContent = emoji;
      reactionsContainer.appendChild(reaction);
    }
  }

  /**
   * Show notification alert
   */
  showNotificationAlert(notification) {
    console.log('Notification:', notification);
    // Show browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.content,
        icon: 'https://via.placeholder.com/64',
      });
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new ChatApp();
  });
} else {
  window.app = new ChatApp();
}
