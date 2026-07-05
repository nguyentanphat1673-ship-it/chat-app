/**
 * Socket.IO Handler
 * Manages real-time communication using Socket.IO
 */

const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// Store online users
const onlineUsers = new Map();

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`✓ User connected: ${socket.id}`);

    /**
     * User comes online
     */
    socket.on('user_online', async (userId) => {
      try {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;

        // Update user status in database
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // Broadcast online status
        io.emit('user_status_changed', {
          userId,
          isOnline: true,
          lastSeen: new Date(),
        });

        console.log(`✓ User ${userId} is online`);
      } catch (error) {
        console.error('Error in user_online:', error);
      }
    });

    /**
     * User is typing
     */
    socket.on('typing', (data) => {
      const { recipientId, groupId, displayName } = data;

      if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('user_typing', {
            userId: socket.userId,
            displayName,
          });
        }
      } else if (groupId) {
        socket.to(`group_${groupId}`).emit('user_typing', {
          userId: socket.userId,
          displayName,
          groupId,
        });
      }
    });

    /**
     * User stopped typing
     */
    socket.on('stop_typing', (data) => {
      const { recipientId, groupId } = data;

      if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('user_stopped_typing', {
            userId: socket.userId,
          });
        }
      } else if (groupId) {
        socket.to(`group_${groupId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          groupId,
        });
      }
    });

    /**
     * New message received
     */
    socket.on('new_message', async (data) => {
      try {
        const { recipientId, groupId, messageId } = data;

        // Get message from database
        const message = await Message.findById(messageId)
          .populate('sender', 'userId displayName avatar');

        if (recipientId) {
          const recipientSocket = onlineUsers.get(recipientId);
          if (recipientSocket) {
            io.to(recipientSocket).emit('message_received', {
              message,
              status: 'delivered',
            });
          }
        } else if (groupId) {
          socket.to(`group_${groupId}`).emit('message_received', {
            message,
            status: 'delivered',
          });
        }

        console.log(`✓ Message ${messageId} delivered`);
      } catch (error) {
        console.error('Error in new_message:', error);
      }
    });

    /**
     * Message seen
     */
    socket.on('message_seen', async (data) => {
      try {
        const { messageId, recipientId, groupId } = data;

        // Update message status
        await Message.findByIdAndUpdate(messageId, {
          status: 'seen',
        });

        if (recipientId) {
          const recipientSocket = onlineUsers.get(recipientId);
          if (recipientSocket) {
            io.to(recipientSocket).emit('message_seen', {
              messageId,
              userId: socket.userId,
            });
          }
        } else if (groupId) {
          socket.to(`group_${groupId}`).emit('message_seen', {
            messageId,
            userId: socket.userId,
            groupId,
          });
        }
      } catch (error) {
        console.error('Error in message_seen:', error);
      }
    });

    /**
     * Message deleted
     */
    socket.on('message_deleted', (data) => {
      const { messageId, recipientId, groupId, deleteForEveryone } = data;

      if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('message_deleted', {
            messageId,
            deleteForEveryone,
          });
        }
      } else if (groupId) {
        socket.to(`group_${groupId}`).emit('message_deleted', {
          messageId,
          deleteForEveryone,
          groupId,
        });
      }
    });

    /**
     * Message edited
     */
    socket.on('message_edited', (data) => {
      const { messageId, content, recipientId, groupId } = data;

      if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('message_edited', {
            messageId,
            content,
          });
        }
      } else if (groupId) {
        socket.to(`group_${groupId}`).emit('message_edited', {
          messageId,
          content,
          groupId,
        });
      }
    });

    /**
     * Reaction added
     */
    socket.on('reaction_added', (data) => {
      const { messageId, emoji, recipientId, groupId } = data;

      if (recipientId) {
        const recipientSocket = onlineUsers.get(recipientId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('reaction_added', {
            messageId,
            emoji,
            userId: socket.userId,
          });
        }
      } else if (groupId) {
        socket.to(`group_${groupId}`).emit('reaction_added', {
          messageId,
          emoji,
          userId: socket.userId,
          groupId,
        });
      }
    });

    /**
     * Join group
     */
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
      socket.to(`group_${groupId}`).emit('user_joined_group', {
        userId: socket.userId,
        groupId,
      });
      console.log(`✓ User ${socket.userId} joined group ${groupId}`);
    });

    /**
     * Leave group
     */
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`);
      socket.to(`group_${groupId}`).emit('user_left_group', {
        userId: socket.userId,
        groupId,
      });
      console.log(`✓ User ${socket.userId} left group ${groupId}`);
    });

    /**
     * Friend request sent
     */
    socket.on('friend_request_sent', (data) => {
      const { recipientId } = data;
      const recipientSocket = onlineUsers.get(recipientId);

      if (recipientSocket) {
        io.to(recipientSocket).emit('friend_request_received', {
          userId: socket.userId,
        });
      }
    });

    /**
     * Friend request accepted
     */
    socket.on('friend_request_accepted', (data) => {
      const { senderId } = data;
      const senderSocket = onlineUsers.get(senderId);

      if (senderSocket) {
        io.to(senderSocket).emit('friend_request_accepted', {
          userId: socket.userId,
        });
      }
    });

    /**
     * Notification received
     */
    socket.on('notification_received', (data) => {
      const { recipientId, notification } = data;
      const recipientSocket = onlineUsers.get(recipientId);

      if (recipientSocket) {
        io.to(recipientSocket).emit('new_notification', notification);
      }
    });

    /**
     * User goes offline
     */
    socket.on('disconnect', async () => {
      try {
        const userId = socket.userId;

        if (userId) {
          onlineUsers.delete(userId);

          // Update user status in database
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          });

          // Broadcast offline status
          io.emit('user_status_changed', {
            userId,
            isOnline: false,
            lastSeen: new Date(),
          });

          console.log(`✗ User ${userId} disconnected`);
        }
      } catch (error) {
        console.error('Error in disconnect:', error);
      }
    });

    /**
     * Error handling
     */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = setupSocket;
