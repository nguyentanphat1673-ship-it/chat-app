/**
 * Group Model
 * Defines the schema for group chats in MongoDB
 */

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  // Group Information
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [2, 'Group name must be at least 2 characters'],
    maxlength: [100, 'Group name cannot exceed 100 characters'],
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150?text=Group',
  },
  
  avatarPath: {
    type: String,
    default: null,
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required'],
  },
  
  // Admins
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Members
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Banned Members
  bannedMembers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    bannedAt: {
      type: Date,
      default: Date.now,
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  
  // Group Settings
  settings: {
    isPublic: {
      type: Boolean,
      default: false,
    },
    allowMembersToAdd: {
      type: Boolean,
      default: false,
    },
    allowMembersToInvite: {
      type: Boolean,
      default: false,
    },
    allowMembersToChangeGroupInfo: {
      type: Boolean,
      default: false,
    },
  },
  
  // Pinned Messages
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for efficient queries
groupSchema.index({ owner: 1 });
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Group', groupSchema);
