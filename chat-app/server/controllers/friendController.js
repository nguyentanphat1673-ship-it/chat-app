/**
 * Friend Controller
 * Handles friend requests, friend list, and friend management
 */

const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Send Friend Request
 */
exports.sendFriendRequest = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required',
      });
    }

    if (userId === recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself',
      });
    }

    // Get both users
    const sender = await User.findById(userId);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if already friends
    if (sender.friends.includes(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'Already friends with this user',
      });
    }

    // Check if request already sent
    const existingRequest = sender.friendRequests.sent.find(
      (req) => req.userId.toString() === recipientId
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent',
      });
    }

    // Add to sent requests
    sender.friendRequests.sent.push({
      userId: recipientId,
      sentAt: new Date(),
    });

    // Add to received requests
    recipient.friendRequests.received.push({
      userId: userId,
      receivedAt: new Date(),
    });

    await sender.save();
    await recipient.save();

    // Create notification
    await Notification.create({
      recipient: recipientId,
      sender: userId,
      type: 'friend_request',
      title: `${sender.displayName} sent you a friend request`,
      content: `${sender.displayName} wants to be your friend`,
      relatedData: {
        userId: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Friend request sent successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept Friend Request
 */
exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
      });
    }

    // Get both users
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if request exists
    const requestIndex = user.friendRequests.received.findIndex(
      (req) => req.userId.toString() === senderId
    );

    if (requestIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No friend request from this user',
      });
    }

    // Remove from received requests
    user.friendRequests.received.splice(requestIndex, 1);

    // Remove from sent requests
    const sentIndex = sender.friendRequests.sent.findIndex(
      (req) => req.userId.toString() === userId
    );

    if (sentIndex !== -1) {
      sender.friendRequests.sent.splice(sentIndex, 1);
    }

    // Add to friends
    user.friends.push(senderId);
    sender.friends.push(userId);

    await user.save();
    await sender.save();

    // Create notification
    await Notification.create({
      recipient: senderId,
      sender: userId,
      type: 'friend_accepted',
      title: `${user.displayName} accepted your friend request`,
      content: `${user.displayName} is now your friend`,
      relatedData: {
        userId: userId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Friend Request
 */
exports.rejectFriendRequest = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'Sender ID is required',
      });
    }

    // Get both users
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove from received requests
    const receivedIndex = user.friendRequests.received.findIndex(
      (req) => req.userId.toString() === senderId
    );

    if (receivedIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No friend request from this user',
      });
    }

    user.friendRequests.received.splice(receivedIndex, 1);

    // Remove from sent requests
    const sentIndex = sender.friendRequests.sent.findIndex(
      (req) => req.userId.toString() === userId
    );

    if (sentIndex !== -1) {
      sender.friendRequests.sent.splice(sentIndex, 1);
    }

    await user.save();
    await sender.save();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel Friend Request
 */
exports.cancelFriendRequest = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required',
      });
    }

    // Get both users
    const user = await User.findById(userId);
    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove from sent requests
    const sentIndex = user.friendRequests.sent.findIndex(
      (req) => req.userId.toString() === recipientId
    );

    if (sentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'No friend request sent to this user',
      });
    }

    user.friendRequests.sent.splice(sentIndex, 1);

    // Remove from received requests
    const receivedIndex = recipient.friendRequests.received.findIndex(
      (req) => req.userId.toString() === userId
    );

    if (receivedIndex !== -1) {
      recipient.friendRequests.received.splice(receivedIndex, 1);
    }

    await user.save();
    await recipient.save();

    res.status(200).json({
      success: true,
      message: 'Friend request cancelled',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Friend
 */
exports.removeFriend = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({
        success: false,
        message: 'Friend ID is required',
      });
    }

    // Get both users
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove from friends
    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== userId);

    await user.save();
    await friend.save();

    res.status(200).json({
      success: true,
      message: 'Friend removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Friends List
 */
exports.getFriendsList = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friends', 'userId displayName avatar isOnline lastSeen');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user.friends,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Friend Requests
 */
exports.getFriendRequests = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friendRequests.sent.userId', 'userId displayName avatar')
      .populate('friendRequests.received.userId', 'userId displayName avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sent: user.friendRequests.sent,
        received: user.friendRequests.received,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Online Friends
 */
exports.getOnlineFriends = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId)
      .populate('friends', 'userId displayName avatar isOnline lastSeen');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const onlineFriends = user.friends.filter((friend) => friend.isOnline);

    res.status(200).json({
      success: true,
      data: onlineFriends,
    });
  } catch (error) {
    next(error);
  }
};
