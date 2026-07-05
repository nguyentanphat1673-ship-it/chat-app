/**
 * Group Routes
 * Defines API endpoints for group operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { uploadAvatar } = require('../config/multer');
const groupController = require('../controllers/groupController');

// Protected routes
router.post('/create', protect, groupController.createGroup);
router.get('/:groupId', protect, groupController.getGroupDetails);
router.put('/:groupId/update', protect, groupController.updateGroup);
router.put('/:groupId/avatar', protect, uploadAvatar.single('avatar'), groupController.updateGroupAvatar);
router.post('/:groupId/member/add', protect, groupController.addMember);
router.post('/:groupId/member/remove', protect, groupController.removeMember);
router.post('/:groupId/leave', protect, groupController.leaveGroup);
router.delete('/:groupId/delete', protect, groupController.deleteGroup);
router.post('/:groupId/admin/add', protect, groupController.addAdmin);
router.post('/:groupId/admin/remove', protect, groupController.removeAdmin);
router.post('/:groupId/transfer-ownership', protect, groupController.transferOwnership);
router.get('/user/groups', protect, groupController.getUserGroups);

module.exports = router;
