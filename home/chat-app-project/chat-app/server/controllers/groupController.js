/**
 * Group Controller
 * Handles group chat operations
 */

const Group = require('../models/Group');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const fs = require('fs');

/**
 * Create Group
 */
exports.createGroup = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { name, description, memberIds } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required',
      });
    }

    // Create group
    const group = new Group({
      name,
      description: description || '',
      owner: userId,
      admins: [userId],
      members: [
        {
          userId,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
    });

    // Add members
    if (memberIds && Array.isArray(memberIds)) {
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          group.members.push({
            userId: memberId,
            role: 'member',
            joinedAt: new Date(),
          });

          // Create notification
          await Notification.create({
            recipient: memberId,
            sender: userId,
            type: 'group_invite',
            title: `You were added to ${name}`,
            content: `You were added to the group ${name}`,
            relatedData: {
              groupId: group._id,
            },
          });
        }
      }
    }

    await group.save();

    await group.populate('owner', 'userId displayName avatar');
    await group.populate('members.userId', 'userId displayName avatar');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Group Details
 */
exports.getGroupDetails = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('owner', 'userId displayName avatar')
      .populate('admins', 'userId displayName avatar')
      .populate('members.userId', 'userId displayName avatar isOnline')
      .populate('bannedMembers.userId', 'userId displayName');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Group
 */
exports.updateGroup = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { name, description } = req.body;

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner or admin
    if (group.owner.toString() !== userId && !group.admins.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this group',
      });
    }

    // Update group
    if (name) group.name = name;
    if (description) group.description = description;

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Group Avatar
 */
exports.updateGroupAvatar = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can update avatar',
      });
    }

    // Delete old avatar if exists
    if (group.avatarPath && fs.existsSync(group.avatarPath)) {
      fs.unlinkSync(group.avatarPath);
    }

    // Update avatar
    group.avatar = `/uploads/avatars/${req.file.filename}`;
    group.avatarPath = req.file.path;
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Group avatar updated successfully',
      data: {
        avatar: group.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Member to Group
 */
exports.addMember = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner or admin
    if (group.owner.toString() !== userId && !group.admins.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add members',
      });
    }

    // Check if member already exists
    const memberExists = group.members.find(
      (member) => member.userId.toString() === memberId
    );

    if (memberExists) {
      return res.status(400).json({
        success: false,
        message: 'Member already in group',
      });
    }

    // Add member
    group.members.push({
      userId: memberId,
      role: 'member',
      joinedAt: new Date(),
    });

    await group.save();

    // Create notification
    const user = await User.findById(userId);
    await Notification.create({
      recipient: memberId,
      sender: userId,
      type: 'group_member_added',
      title: `You were added to ${group.name}`,
      content: `${user.displayName} added you to ${group.name}`,
      relatedData: {
        groupId: groupId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Member added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Member from Group
 */
exports.removeMember = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner or admin
    if (group.owner.toString() !== userId && !group.admins.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove members',
      });
    }

    // Remove member
    group.members = group.members.filter(
      (member) => member.userId.toString() !== memberId
    );

    // Remove from admins if exists
    group.admins = group.admins.filter((admin) => admin.toString() !== memberId);

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Leave Group
 */
exports.leaveGroup = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave the group. Transfer ownership first.',
      });
    }

    // Remove member
    group.members = group.members.filter(
      (member) => member.userId.toString() !== userId
    );

    // Remove from admins if exists
    group.admins = group.admins.filter((admin) => admin.toString() !== userId);

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Left group successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Group
 */
exports.deleteGroup = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can delete the group',
      });
    }

    // Delete group avatar if exists
    if (group.avatarPath && fs.existsSync(group.avatarPath)) {
      fs.unlinkSync(group.avatarPath);
    }

    // Delete all messages in group
    await Message.deleteMany({ group: groupId });

    // Delete group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Admin
 */
exports.addAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID is required',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can add admins',
      });
    }

    // Check if member exists
    const memberExists = group.members.find(
      (member) => member.userId.toString() === memberId
    );

    if (!memberExists) {
      return res.status(400).json({
        success: false,
        message: 'Member not found in group',
      });
    }

    // Check if already admin
    if (group.admins.includes(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Member is already an admin',
      });
    }

    // Add admin
    group.admins.push(memberId);

    // Update member role
    const member = group.members.find(
      (m) => m.userId.toString() === memberId
    );
    if (member) {
      member.role = 'admin';
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Admin added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Admin
 */
exports.removeAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can remove admins',
      });
    }

    // Remove admin
    group.admins = group.admins.filter((admin) => admin.toString() !== adminId);

    // Update member role
    const member = group.members.find(
      (m) => m.userId.toString() === adminId
    );
    if (member) {
      member.role = 'member';
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Admin removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer Ownership
 */
exports.transferOwnership = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { groupId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'New owner ID is required',
      });
    }

    // Get group
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check if user is owner
    if (group.owner.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can transfer ownership',
      });
    }

    // Check if new owner is member
    const memberExists = group.members.find(
      (member) => member.userId.toString() === newOwnerId
    );

    if (!memberExists) {
      return res.status(400).json({
        success: false,
        message: 'New owner must be a group member',
      });
    }

    // Transfer ownership
    group.owner = newOwnerId;

    // Update roles
    const newOwnerMember = group.members.find(
      (m) => m.userId.toString() === newOwnerId
    );
    if (newOwnerMember) {
      newOwnerMember.role = 'owner';
    }

    const oldOwnerMember = group.members.find(
      (m) => m.userId.toString() === userId
    );
    if (oldOwnerMember) {
      oldOwnerMember.role = 'member';
    }

    // Update admins
    group.admins = group.admins.filter((admin) => admin.toString() !== userId);
    if (!group.admins.includes(newOwnerId)) {
      group.admins.push(newOwnerId);
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Groups
 */
exports.getUserGroups = async (req, res, next) => {
  try {
    const userId = req.userId;

    const groups = await Group.find({
      'members.userId': userId,
    })
      .populate('owner', 'userId displayName avatar')
      .populate('members.userId', 'userId displayName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};
