/**
 * Friend Routes
 * Defines API endpoints for friend operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const friendController = require('../controllers/friendController');

// Protected routes
router.post('/request/send', protect, friendController.sendFriendRequest);
router.post('/request/accept', protect, friendController.acceptFriendRequest);
router.post('/request/reject', protect, friendController.rejectFriendRequest);
router.post('/request/cancel', protect, friendController.cancelFriendRequest);
router.post('/remove', protect, friendController.removeFriend);
router.get('/list', protect, friendController.getFriendsList);
router.get('/requests', protect, friendController.getFriendRequests);
router.get('/online', protect, friendController.getOnlineFriends);

module.exports = router;
