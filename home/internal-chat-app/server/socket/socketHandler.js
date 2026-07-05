const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const Group = require("../models/Group");

let onlineUsers = {}; // { userId: socketId }

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Authenticate user via JWT token
    socket.on("authenticate", async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");

        if (!user) {
          throw new Error("User not found");
        }

        socket.user = user; // Attach user object to socket
        onlineUsers[user._id.toString()] = socket.id;
        console.log(`User ${user.user_id} authenticated and online.`);
        io.emit("user_online", user._id); // Notify all clients that this user is online

        // Join user to a private room based on their user ID for private messages
        socket.join(user._id.toString());

        // Emit current online users to the newly connected client
        socket.emit("online_users", Object.keys(onlineUsers));

      } catch (error) {
        console.error("Socket authentication error:", error.message);
        socket.emit("auth_error", "Authentication failed");
        socket.disconnect();
      }
    });

    // Handle private messages
    socket.on("private_message", async ({ receiverId, content, file, fileType }) => {
      if (!socket.user) {
        return socket.emit("error", "User not authenticated");
      }

      try {
        const newMessage = new Message({
          sender: socket.user._id,
          receiver: receiverId,
          content,
          file,
          fileType,
        });
        await newMessage.save();

        await newMessage.populate("sender", "user_id email avatar");
        await newMessage.populate("receiver", "user_id email avatar");

        // Emit to receiver
        if (onlineUsers[receiverId]) {
          io.to(onlineUsers[receiverId]).emit("new_message", newMessage);
        }
        // Emit to sender (for self-update)
        socket.emit("new_message", newMessage);

      } catch (error) {
        console.error("Error sending private message:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle group messages
    socket.on("group_message", async ({ groupId, content, file, fileType }) => {
      if (!socket.user) {
        return socket.emit("error", "User not authenticated");
      }

      try {
        const group = await Group.findById(groupId);
        if (!group) {
          return socket.emit("error", "Group not found");
        }

        // Check if sender is a member of the group
        const isMember = group.members.some(member => member.user.toString() === socket.user._id.toString());
        if (!isMember) {
          return socket.emit("error", "You are not a member of this group");
        }

        const newMessage = new Message({
          sender: socket.user._id,
          group: groupId,
          content,
          file,
          fileType,
        });
        await newMessage.save();

        group.messages.push(newMessage._id);
        await group.save();

        await newMessage.populate("sender", "user_id email avatar");
        await newMessage.populate("group", "name avatar");

        // Emit to all members in the group
        group.members.forEach(member => {
          if (onlineUsers[member.user.toString()]) {
            io.to(onlineUsers[member.user.toString()]).emit("new_message", newMessage);
          }
        });

      } catch (error) {
        console.error("Error sending group message:", error);
        socket.emit("error", "Failed to send group message");
      }
    });

    // Handle typing indicator
    socket.on("typing", ({ receiverId, groupId }) => {
      if (!socket.user) return;
      if (receiverId && onlineUsers[receiverId]) {
        io.to(onlineUsers[receiverId]).emit("typing", { senderId: socket.user._id, senderUserId: socket.user.user_id });
      } else if (groupId) {
        // Emit to all group members except the sender
        socket.to(groupId).emit("typing", { senderId: socket.user._id, senderUserId: socket.user.user_id, groupId });
      }
    });

    // Handle stop typing indicator
    socket.on("stop_typing", ({ receiverId, groupId }) => {
      if (!socket.user) return;
      if (receiverId && onlineUsers[receiverId]) {
        io.to(onlineUsers[receiverId]).emit("stop_typing", { senderId: socket.user._id, senderUserId: socket.user.user_id });
      } else if (groupId) {
        // Emit to all group members except the sender
        socket.to(groupId).emit("stop_typing", { senderId: socket.user._id, senderUserId: socket.user.user_id, groupId });
      }
    });

    // Handle message seen status
    socket.on("message_seen", async ({ messageId }) => {
      if (!socket.user) {
        return socket.emit("error", "User not authenticated");
      }

      try {
        const message = await Message.findById(messageId);
        if (message && !message.seenBy.includes(socket.user._id)) {
          message.seenBy.push(socket.user._id);
          await message.save();
          // Emit to sender that message has been seen
          if (onlineUsers[message.sender.toString()]) {
            io.to(onlineUsers[message.sender.toString()]).emit("message_seen", { messageId, seenBy: socket.user._id });
          }
        }
      } catch (error) {
        console.error("Error updating message seen status:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      if (socket.user) {
        delete onlineUsers[socket.user._id.toString()];
        io.emit("user_offline", socket.user._id); // Notify all clients that this user is offline
        console.log(`User ${socket.user.user_id} went offline.`);
      }
    });
  });
};
