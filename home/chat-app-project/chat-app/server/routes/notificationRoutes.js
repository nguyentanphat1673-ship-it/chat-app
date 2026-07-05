/**
 * Notification Routes
 * Defines API endpoints for notification operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// Protected routes
router.get('/', protect, notificationController.getNotifications);
router.get('/unread-count', protect, notificationController.getUnreadCount);
router.put('/:notificationId/read', protect, notificationController.markAsRead);
router.put('/mark-all-as-read', protect, notificationController.markAllAsRead);
router.delete('/:notificationId', protect, notificationController.deleteNotification);
router.delete('/', protect, notificationController.deleteAllNotifications);

module.exports = router;
