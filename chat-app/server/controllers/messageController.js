/**
 * Message Controller
 * Handles message operations (send, edit, delete, etc.)
 */

const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const fs = require('fs');

/**
 * Send Message
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { content, recipientId, groupId, messageType, replyTo } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Message content or file is required',
      });
    }

    if (!recipientId && !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient or group is required',
      });
    }

    // Prepare message data
    const messageData = {
      sender: userId,
      content: content || '',
      messageType: messageType || 'text',
    };

    // Add recipient or group
    if (recipientId) {
      messageData.recipient = recipientId;
    } else if (groupId) {
      messageData.group = groupId;
    }

    // Handle file upload
    if (req.file) {
      messageData.media = {
        url: `/uploads/${req.file.destination.split('/').pop()}/${req.file.filename}`,
        path: req.file.path,
        type: req.file.mimetype,
        size: req.file.size,
      };

      // Determine message type based on file
      if (req.file.mimetype.startsWith('image/')) {
        messageData.messageType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        messageData.messageType = 'video';
      } else {
        messageData.messageType = 'file';
      }
    }

    // Handle reply
    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    // Create message
    const message = new Message(messageData);
    await message.save();

    // Populate sender info
    await message.populate('sender', 'userId displayName avatar');
    await message.populate('replyTo');

    // Update delivered to
    if (recipientId) {
      message.deliveredTo.push(recipientId);
      await message.save();
    } else if (groupId) {
      // Add all group members to deliveredTo
      const group = await Group.findById(groupId);
      if (group) {
        group.members.forEach((member) => {
          if (member.userId.toString() !== userId) {
            message.deliveredTo.push(member.userId);
          }
        });
        await message.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Messages (Direct or Group)
 */
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { recipientId, groupId, page = 1, limit = 50 } = req.query;

    if (!recipientId && !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient or group is required',
      });
    }

    const skip = (page - 1) * limit;

    let query = {};

    if (recipientId) {
      query = {
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ],
      };
    } else if (groupId) {
      query = { group: groupId };
    }

    const messages = await Message.find(query)
      .populate('sender', 'userId displayName avatar')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit Message
 */
exports.editMessage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'New content is required',
      });
    }

    // Get message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages',
      });
    }

    // Save to edit history
    message.editHistory.push({
      content: message.content,
      editedAt: new Date(),
    });

    // Update content
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    await message.populate('sender', 'userId displayName avatar');

    res.status(200).json({
      success: true,
      message: 'Message edited successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Message
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    // Get message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is sender
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    if (deleteForEveryone) {
      // Delete for everyone
      message.deletedForEveryone = true;
      message.isDeleted = true;

      // Delete media file if exists
      if (message.media && message.media.path && fs.existsSync(message.media.path)) {
        fs.unlinkSync(message.media.path);
      }
    } else {
      // Delete for me only
      message.deletedFor.push(userId);
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Reaction
 */
exports.addReaction = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required',
      });
    }

    // Get message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user already reacted
    const existingReaction = message.reactions.find(
      (reaction) => reaction.userId.toString() === userId && reaction.emoji === emoji
    );

    if (existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You already reacted with this emoji',
      });
    }

    // Add reaction
    message.reactions.push({
      userId,
      emoji,
      createdAt: new Date(),
    });

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Reaction
 */
exports.removeReaction = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required',
      });
    }

    // Get message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Remove reaction
    message.reactions = message.reactions.filter(
      (reaction) => !(reaction.userId.toString() === userId && reaction.emoji === emoji)
    );

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      data: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark as Seen
 */
exports.markAsSeen = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required',
      });
    }

    // Get message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if already seen
    const alreadySeen = message.seenBy.find(
      (seen) => seen.userId.toString() === userId
    );

    if (!alreadySeen) {
      message.seenBy.push({
        userId,
        seenAt: new Date(),
      });

      message.status = 'seen';
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as seen',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search Messages
 */
exports.searchMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { query, recipientId, groupId } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    let searchQuery = {
      content: { $regex: query, $options: 'i' },
    };

    if (recipientId) {
      searchQuery = {
        ...searchQuery,
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId },
        ],
      };
    } else if (groupId) {
      searchQuery = {
        ...searchQuery,
        group: groupId,
      };
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', 'userId displayName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};
