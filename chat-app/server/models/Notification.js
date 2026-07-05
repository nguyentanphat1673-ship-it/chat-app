/**
 * Notification Model
 * Defines the schema for notifications in MongoDB
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
  },
  
  // Sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required'],
  },
  
  // Notification Type
  type: {
    type: String,
    enum: ['message', 'friend_request', 'friend_accepted', 'group_invite', 'group_member_added', 'mention', 'reaction'],
    required: [true, 'Notification type is required'],
  },
  
  // Title and Content
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  
  // Related Data
  relatedData: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  
  // Read Status
  isRead: {
    type: Boolean,
    default: false,
  },
  
  readAt: {
    type: Date,
    default: null,
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
