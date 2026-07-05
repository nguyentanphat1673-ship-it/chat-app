/**
 * Socket.IO Client
 * Handles real-time communication
 */

const SOCKET_URL = 'http://localhost:3000';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }

  /**
   * Connect to socket server
   */
  connect(userId) {
    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✓ Socket connected:', this.socket.id);
      this.socket.emit('user_online', userId);
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Socket disconnected');
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Listen to event
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove listener
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback
      );
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Send new message
   */
  sendMessage(data) {
    this.emit('new_message', data);
  }

  /**
   * User typing
   */
  typing(data) {
    this.emit('typing', data);
  }

  /**
   * Stop typing
   */
  stopTyping(data) {
    this.emit('stop_typing', data);
  }

  /**
   * Mark message as seen
   */
  markMessageAsSeen(data) {
    this.emit('message_seen', data);
  }

  /**
   * Delete message
   */
  deleteMessage(data) {
    this.emit('message_deleted', data);
  }

  /**
   * Edit message
   */
  editMessage(data) {
    this.emit('message_edited', data);
  }

  /**
   * Add reaction
   */
  addReaction(data) {
    this.emit('reaction_added', data);
  }

  /**
   * Join group
   */
  joinGroup(groupId) {
    this.emit('join_group', groupId);
  }

  /**
   * Leave group
   */
  leaveGroup(groupId) {
    this.emit('leave_group', groupId);
  }

  /**
   * Send friend request
   */
  sendFriendRequest(data) {
    this.emit('friend_request_sent', data);
  }

  /**
   * Accept friend request
   */
  acceptFriendRequest(data) {
    this.emit('friend_request_accepted', data);
  }

  /**
   * Send notification
   */
  sendNotification(data) {
    this.emit('notification_received', data);
  }

  /**
   * Listen to user status change
   */
  onUserStatusChanged(callback) {
    this.on('user_status_changed', callback);
  }

  /**
   * Listen to message received
   */
  onMessageReceived(callback) {
    this.on('message_received', callback);
  }

  /**
   * Listen to user typing
   */
  onUserTyping(callback) {
    this.on('user_typing', callback);
  }

  /**
   * Listen to user stopped typing
   */
  onUserStoppedTyping(callback) {
    this.on('user_stopped_typing', callback);
  }

  /**
   * Listen to message seen
   */
  onMessageSeen(callback) {
    this.on('message_seen', callback);
  }

  /**
   * Listen to message deleted
   */
  onMessageDeleted(callback) {
    this.on('message_deleted', callback);
  }

  /**
   * Listen to message edited
   */
  onMessageEdited(callback) {
    this.on('message_edited', callback);
  }

  /**
   * Listen to reaction added
   */
  onReactionAdded(callback) {
    this.on('reaction_added', callback);
  }

  /**
   * Listen to user joined group
   */
  onUserJoinedGroup(callback) {
    this.on('user_joined_group', callback);
  }

  /**
   * Listen to user left group
   */
  onUserLeftGroup(callback) {
    this.on('user_left_group', callback);
  }

  /**
   * Listen to friend request received
   */
  onFriendRequestReceived(callback) {
    this.on('friend_request_received', callback);
  }

  /**
   * Listen to friend request accepted
   */
  onFriendRequestAccepted(callback) {
    this.on('friend_request_accepted', callback);
  }

  /**
   * Listen to new notification
   */
  onNewNotification(callback) {
    this.on('new_notification', callback);
  }

  /**
   * Listen to connected
   */
  onConnected(callback) {
    this.on('connected', callback);
  }

  /**
   * Listen to disconnected
   */
  onDisconnected(callback) {
    this.on('disconnected', callback);
  }

  /**
   * Listen to error
   */
  onError(callback) {
    this.on('error', callback);
  }
}

// Create global socket instance
const socket = new SocketClient();
