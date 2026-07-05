const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { sendMessage, getMessages, uploadFile } = require("../controllers/messageController");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();

router.post("/send", protect, upload.single("file"), sendMessage);
router.get("/:receiverId", protect, getMessages);

module.exports = router;
