const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
} = require("../controllers/userController");
const router = express.Router();

router.get("/search/:user_id", protect, searchUser);
router.post("/friend-request/:user_id", protect, sendFriendRequest);
router.post("/friend-request/accept/:user_id", protect, acceptFriendRequest);
router.post("/friend-request/reject/:user_id", protect, rejectFriendRequest);
router.get("/friend-requests", protect, getFriendRequests);
router.get("/friends", protect, getFriends);

module.exports = router;
