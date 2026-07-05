const User = require("../models/User");

// @desc    Search user by user_id
// @route   GET /api/users/search/:user_id
// @access  Private
const searchUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findOne({ user_id }).select("-password -otp -otpExpires");

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "Không tìm thấy người dùng." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi tìm kiếm người dùng." });
  }
};

// @desc    Send friend request
// @route   POST /api/users/friend-request/:user_id
// @access  Private
const sendFriendRequest = async (req, res) => {
  const { user_id } = req.params; // user_id of the recipient
  const senderId = req.user._id; // ID of the logged-in user (sender)

  try {
    const recipient = await User.findOne({ user_id });
    const sender = await User.findById(senderId);

    if (!recipient) {
      return res.status(404).json({ message: "Người nhận không tồn tại." });
    }

    if (recipient._id.toString() === senderId.toString()) {
      return res.status(400).json({ message: "Không thể gửi lời mời kết bạn cho chính mình." });
    }

    // Check if already friends
    if (sender.friends.includes(recipient._id)) {
      return res.status(400).json({ message: "Bạn đã là bạn bè với người này." });
    }

    // Check if request already sent
    if (sender.friendRequestsSent.includes(recipient._id)) {
      return res.status(400).json({ message: "Lời mời kết bạn đã được gửi." });
    }

    // Check if recipient already sent a request to sender
    if (recipient.friendRequestsSent.includes(senderId)) {
      return res.status(400).json({ message: "Người này đã gửi lời mời kết bạn cho bạn. Vui lòng chấp nhận." });
    }

    // Add to sender's sent requests
    sender.friendRequestsSent.push(recipient._id);
    await sender.save();

    // Add to recipient's received requests
    recipient.friendRequestsReceived.push(senderId);
    await recipient.save();

    res.status(200).json({ message: "Lời mời kết bạn đã được gửi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi gửi lời mời kết bạn." });
  }
};

// @desc    Accept friend request
// @route   POST /api/users/friend-request/accept/:user_id
// @access  Private
const acceptFriendRequest = async (req, res) => {
  const { user_id } = req.params; // user_id of the sender of the request
  const recipientId = req.user._id; // ID of the logged-in user (recipient)

  try {
    const sender = await User.findOne({ user_id });
    const recipient = await User.findById(recipientId);

    if (!sender) {
      return res.status(404).json({ message: "Người gửi không tồn tại." });
    }

    // Check if request exists in recipient's received requests
    if (!recipient.friendRequestsReceived.includes(sender._id)) {
      return res.status(400).json({ message: "Không có lời mời kết bạn từ người này." });
    }

    // Add to friends list for both users
    sender.friends.push(recipientId);
    recipient.friends.push(sender._id);

    // Remove from friend requests
    sender.friendRequestsSent = sender.friendRequestsSent.filter(
      (id) => id.toString() !== recipientId.toString()
    );
    recipient.friendRequestsReceived = recipient.friendRequestsReceived.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    await sender.save();
    await recipient.save();

    res.status(200).json({ message: "Lời mời kết bạn đã được chấp nhận." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi chấp nhận lời mời kết bạn." });
  }
};

// @desc    Reject friend request
// @route   POST /api/users/friend-request/reject/:user_id
// @access  Private
const rejectFriendRequest = async (req, res) => {
  const { user_id } = req.params; // user_id of the sender of the request
  const recipientId = req.user._id; // ID of the logged-in user (recipient)

  try {
    const sender = await User.findOne({ user_id });
    const recipient = await User.findById(recipientId);

    if (!sender) {
      return res.status(404).json({ message: "Người gửi không tồn tại." });
    }

    // Check if request exists in recipient's received requests
    if (!recipient.friendRequestsReceived.includes(sender._id)) {
      return res.status(400).json({ message: "Không có lời mời kết bạn từ người này." });
    }

    // Remove from friend requests
    sender.friendRequestsSent = sender.friendRequestsSent.filter(
      (id) => id.toString() !== recipientId.toString()
    );
    recipient.friendRequestsReceived = recipient.friendRequestsReceived.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    await sender.save();
    await recipient.save();

    res.status(200).json({ message: "Lời mời kết bạn đã bị từ chối." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi từ chối lời mời kết bạn." });
  }
};

// @desc    Get friend requests received by the logged-in user
// @route   GET /api/users/friend-requests
// @access  Private
const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friendRequestsReceived",
      "user_id email avatar"
    );

    res.json(user.friendRequestsReceived);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách lời mời kết bạn." });
  }
};

// @desc    Get friends of the logged-in user
// @route   GET /api/users/friends
// @access  Private
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("friends", "user_id email avatar");

    res.json(user.friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy danh sách bạn bè." });
  }
};

module.exports = {
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
};
