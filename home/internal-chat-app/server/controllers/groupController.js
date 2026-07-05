const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  const { name, members } = req.body;
  const ownerId = req.user._id;

  try {
    const newGroup = new Group({
      name,
      members: [{ user: ownerId, role: "owner" }],
    });

    // Add initial members if provided
    if (members && members.length > 0) {
      for (const memberId of members) {
        const user = await User.findById(memberId);
        if (user) {
          newGroup.members.push({ user: memberId, role: "member" });
        }
      }
    }

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi tạo nhóm." });
  }
};

// @desc    Get group details
// @route   GET /api/groups/:groupId
// @access  Private
const getGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId)
      .populate("members.user", "user_id email avatar")
      .populate("messages");

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }

    // Check if user is a member of the group
    const isMember = group.members.some(
      (member) => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Bạn không phải là thành viên của nhóm này." });
    }

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy thông tin nhóm." });
  }
};

// @desc    Update group (name, avatar)
// @route   PUT /api/groups/:groupId
// @access  Private
const updateGroup = async (req, res) => {
  const { groupId } = req.params;
  const { name } = req.body;
  let avatar = req.body.avatar; // Can be a string if not uploading new file

  if (req.file) {
    avatar = `/uploads/${req.file.filename}`;
  }

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }

    // Check if user is owner or admin
    const userRole = group.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    )?.role;

    if (!["owner", "admin"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa nhóm này." });
    }

    if (name) group.name = name;
    if (avatar) group.avatar = avatar;

    await group.save();
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật nhóm." });
  }
};

// @desc    Add member to group
// @route   POST /api/groups/:groupId/add-member
// @access  Private
const addMember = async (req, res) => {
  const { groupId } = req.params;
  const { user_id } = req.body;

  try {
    const group = await Group.findById(groupId);
    const userToAdd = await User.findOne({ user_id });

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }
    if (!userToAdd) {
      return res.status(404).json({ message: "Không tìm thấy người dùng để thêm." });
    }

    // Check if user is owner or admin
    const userRole = group.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    )?.role;

    if (!["owner", "admin"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền thêm thành viên vào nhóm này." });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(
      (member) => member.user.toString() === userToAdd._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: "Người dùng đã là thành viên của nhóm." });
    }

    group.members.push({ user: userToAdd._id, role: "member" });
    await group.save();

    res.status(200).json({ message: "Đã thêm thành viên vào nhóm thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi thêm thành viên." });
  }
};

// @desc    Remove member from group
// @route   POST /api/groups/:groupId/remove-member
// @access  Private
const removeMember = async (req, res) => {
  const { groupId } = req.params;
  const { user_id } = req.body;

  try {
    const group = await Group.findById(groupId);
    const userToRemove = await User.findOne({ user_id });

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }
    if (!userToRemove) {
      return res.status(404).json({ message: "Không tìm thấy người dùng để xóa." });
    }

    // Check if user is owner or admin
    const userRole = group.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    )?.role;

    if (!["owner", "admin"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền xóa thành viên khỏi nhóm này." });
    }

    // Cannot remove owner
    const memberToRemoveRole = group.members.find(
      (member) => member.user.toString() === userToRemove._id.toString()
    )?.role;
    if (memberToRemoveRole === "owner") {
      return res.status(400).json({ message: "Không thể xóa chủ sở hữu nhóm." });
    }

    group.members = group.members.filter(
      (member) => member.user.toString() !== userToRemove._id.toString()
    );
    await group.save();

    res.status(200).json({ message: "Đã xóa thành viên khỏi nhóm thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xóa thành viên." });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:groupId/leave
// @access  Private
const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }

    // Check if user is owner
    const userRole = group.members.find(
      (member) => member.user.toString() === userId.toString()
    )?.role;

    if (userRole === "owner") {
      return res.status(400).json({ message: "Chủ sở hữu không thể rời nhóm. Vui lòng chuyển quyền sở hữu hoặc xóa nhóm." });
    }

    group.members = group.members.filter(
      (member) => member.user.toString() !== userId.toString()
    );
    await group.save();

    res.status(200).json({ message: "Đã rời nhóm thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi rời nhóm." });
  }
};

// @desc    Delete message in group (Admin/Owner only)
// @route   DELETE /api/groups/:groupId/message/:messageId
// @access  Private
const deleteMessageInGroup = async (req, res) => {
  const { groupId, messageId } = req.params;
  const userId = req.user._id;

  try {
    const group = await Group.findById(groupId);
    const message = await Message.findById(messageId);

    if (!group) {
      return res.status(404).json({ message: "Không tìm thấy nhóm." });
    }
    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn." });
    }

    // Check if user is owner or admin of the group
    const userRole = group.members.find(
      (member) => member.user.toString() === userId.toString()
    )?.role;

    if (!["owner", "admin"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền xóa tin nhắn trong nhóm này." });
    }

    // Remove message from group's messages array
    group.messages = group.messages.filter(
      (msg) => msg.toString() !== messageId.toString()
    );
    await group.save();

    // Delete the message itself
    await Message.deleteOne({ _id: messageId });

    res.status(200).json({ message: "Đã xóa tin nhắn khỏi nhóm thành công." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xóa tin nhắn." });
  }
};


module.exports = {
  createGroup,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
  leaveGroup,
  deleteMessageInGroup,
};
