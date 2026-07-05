/**
 * User Model
 * Defines the schema for user documents in MongoDB
 */

const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  // User Identification
  userId: {
    type: String,
    unique: true,
    sparse: true,
    required: true,
    default: () => `user_${Math.floor(Math.random() * 100000)}`,
  },
  
  // Personal Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    minlength: [2, 'Display name must be at least 2 characters'],
    maxlength: [50, 'Display name cannot exceed 50 characters'],
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  
  phone: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^[0-9]{10,15}$/, 'Please provide a valid phone number'],
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
  },
  
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required'],
  },
  
  // Avatar
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150?text=User',
  },
  
  avatarPath: {
    type: String,
    default: null,
  },
  
  // Bio
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: '',
  },
  
  // Status
  isOnline: {
    type: Boolean,
    default: false,
  },
  
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  
  // Friends
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Friend Requests
  friendRequests: {
    sent: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
    }],
    received: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      receivedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  
  // Blocked Users
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Settings
  settings: {
    rememberLogin: {
      type: Boolean,
      default: false,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
  },
  
  // Refresh Token
  refreshToken: {
    type: String,
    default: null,
  },
  
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcryptjs.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

// Method to get user profile (without sensitive data)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

// Ensure userId is unique and generated correctly
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    let uniqueUserId = false;
    let userId;
    
    while (!uniqueUserId) {
      userId = `user_${Math.floor(Math.random() * 100000)}`;
      const existingUser = await mongoose.model('User').findOne({ userId });
      if (!existingUser) {
        uniqueUserId = true;
        this.userId = userId;
      }
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
