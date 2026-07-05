/**
 * Message Model
 * Defines the schema for messages in MongoDB
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Message Content
  content: {
    type: String,
    trim: true,
  },
  
  // Sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required'],
  },
  
  // Recipient (for direct messages)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Group (for group messages)
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  
  // Message Type
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'emoji', 'sticker', 'gif'],
    default: 'text',
  },
  
  // Media Information
  media: {
    url: String,
    path: String,
    type: String,
    size: Number,
    duration: Number, // for videos
    thumbnail: String, // for videos
  },
  
  // Reactions
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Reply To (for reply feature)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  
  // Forward From (for forward feature)
  forwardFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  
  // Message Status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
  },
  
  // Seen By
  seenBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    seenAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Delivered To
  deliveredTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Pinned
  isPinned: {
    type: Boolean,
    default: false,
  },
  
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  
  // Deleted
  isDeleted: {
    type: Boolean,
    default: false,
  },
  
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  deletedForEveryone: {
    type: Boolean,
    default: false,
  },
  
  // Edited
  isEdited: {
    type: Boolean,
    default: false,
  },
  
  editedAt: {
    type: Date,
    default: null,
  },
  
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
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
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
