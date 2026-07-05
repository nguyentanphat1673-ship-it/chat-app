const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createGroup, getGroup, updateGroup, addMember, removeMember, leaveGroup, deleteMessageInGroup } = require("../controllers/groupController");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();

router.post("/", protect, createGroup);
router.get("/:groupId", protect, getGroup);
router.put("/:groupId", protect, upload.single("avatar"), updateGroup);
router.post("/:groupId/add-member", protect, addMember);
router.post("/:groupId/remove-member", protect, removeMember);
router.post("/:groupId/leave", protect, leaveGroup);
router.delete("/:groupId/message/:messageId", protect, deleteMessageInGroup);

module.exports = router;
