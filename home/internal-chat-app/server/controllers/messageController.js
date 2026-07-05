const Message = require("../models/Message");
const User = require("../models/User");
const Group = require("../models/Group");

// @desc    Send a new message
// @route   POST /api/messages/send
// @access  Private
const sendMessage = async (req, res) => {
  const { receiverId, groupId, content } = req.body;
  const senderId = req.user._id;
  let file = null;
  let fileType = null;

  if (req.file) {
    file = `/uploads/${req.file.filename}`;
    fileType = req.file.mimetype.startsWith("image") ? "image" : "video";
  }

  try {
    let newMessage;

    if (receiverId) {
      // Private message
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({ message: "Người nhận không tồn tại." });
      }
      newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        content,
        file,
        fileType,
      });
    } else if (groupId) {
      // Group message
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Nhóm không tồn tại." });
      }
      // Check if sender is a member of the group
      const isMember = group.members.some(member => member.user.toString() === senderId.toString());
      if (!isMember) {
        return res.status(403).json({ message: "Bạn không phải là thành viên của nhóm này." });
      }
      newMessage = new Message({
        sender: senderId,
        group: groupId,
        content,
        file,
        fileType,
      });
      group.messages.push(newMessage._id);
      await group.save();
    } else {
      return res.status(400).json({ message: "Phải có người nhận hoặc nhóm." });
    }

    await newMessage.save();

    // Populate sender and receiver/group for the response
    await newMessage.populate("sender", "user_id email avatar");
    if (receiverId) {
      await newMessage.populate("receiver", "user_id email avatar");
    } else if (groupId) {
      await newMessage.populate("group", "name avatar");
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi gửi tin nhắn." });
  }
};

// @desc    Get messages between two users or in a group
// @route   GET /api/messages/:id (where id is receiverId or groupId)
// @access  Private
const getMessages = async (req, res) => {
  const { id } = req.params; // This can be receiverId or groupId
  const userId = req.user._id;

  try {
    let messages;
    // Check if it's a private chat or group chat
    const isGroup = await Group.findById(id);

    if (isGroup) {
      // Group chat
      // Check if user is a member of the group
      const isMember = isGroup.members.some(member => member.user.toString() === userId.toString());
      if (!isMember) {
        return res.status(403).json({ message: "Bạn không phải là thành viên của nhóm này." });
      }
      messages = await Message.find({ group: id })
        .populate("sender", "user_id email avatar")
        .sort("createdAt");
    } else {
      // Private chat
      messages = await Message.find({
        $or: [
          { sender: userId, receiver: id },
          { sender: id, receiver: userId },
        ],
      })
        .populate("sender", "user_id email avatar")
        .populate("receiver", "user_id email avatar")
        .sort("createdAt");
    }

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy tin nhắn." });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};
