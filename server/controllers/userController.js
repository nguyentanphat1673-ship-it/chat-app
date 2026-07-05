/**
 * User Controller
 * Handles user-related operations (registration, login, profile, etc.)
 */

const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

/**
 * Register User
 */
exports.register = async (req, res, next) => {
  try {
    const { name, displayName, email, phone, password, confirmPassword, dateOfBirth, gender } = req.body;

    // Validate required fields
    if (!name || !displayName || !email || !password || !confirmPassword || !dateOfBirth || !gender) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number already in use',
      });
    }

    // Create new user
    const user = new User({
      name,
      displayName,
      email,
      phone: phone || undefined,
      password,
      dateOfBirth,
      gender,
    });

    // Save user
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 */
exports.login = async (req, res, next) => {
  try {
    const { login, password, rememberMe } = req.body;

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login and password are required',
      });
    }

    // Find user by email, phone, or userId
    const user = await User.findOne({
      $or: [
        { email: login },
        { phone: login },
        { userId: login },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last seen
    user.lastSeen = new Date();
    user.isOnline = true;

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;

    // Save remember me preference
    if (rememberMe) {
      user.settings.rememberLogin = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Find user
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout User
 */
exports.logout = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Update user status
    await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
      refreshToken: null,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friends', 'userId displayName avatar isOnline')
      .populate('blockedUsers', 'userId displayName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { displayName, bio, dateOfBirth, gender } = req.body;

    const updateData = {};

    if (displayName) updateData.displayName = displayName;
    if (bio) updateData.bio = bio;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Avatar
 */
exports.updateAvatar = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get user
    const user = await User.findById(userId);

    // Delete old avatar if exists
    if (user.avatarPath && fs.existsSync(user.avatarPath)) {
      fs.unlinkSync(user.avatarPath);
    }

    // Update avatar
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    user.avatarPath = req.file.path;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match',
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search Users
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Search users by name, email, phone, or userId
    const users = await User.find({
      $and: [
        {
          $or: [
            { displayName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
            { userId: { $regex: query, $options: 'i' } },
          ],
        },
        { _id: { $ne: userId } }, // Exclude current user
      ],
    })
      .select('userId displayName email phone avatar isOnline')
      .limit(20);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User by ID
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('userId displayName email phone avatar bio dateOfBirth gender isOnline lastSeen');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
