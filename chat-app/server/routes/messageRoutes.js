/**
 * Message Routes
 * Defines API endpoints for message operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { upload } = require('../config/multer');
const messageController = require('../controllers/messageController');

// Protected routes
router.post('/send', protect, upload.single('file'), messageController.sendMessage);
router.get('/get', protect, messageController.getMessages);
router.put('/:messageId/edit', protect, messageController.editMessage);
router.delete('/:messageId/delete', protect, messageController.deleteMessage);
router.post('/:messageId/reaction/add', protect, messageController.addReaction);
router.post('/:messageId/reaction/remove', protect, messageController.removeReaction);
router.post('/mark-as-seen', protect, messageController.markAsSeen);
router.get('/search', protect, messageController.searchMessages);

module.exports = router;
