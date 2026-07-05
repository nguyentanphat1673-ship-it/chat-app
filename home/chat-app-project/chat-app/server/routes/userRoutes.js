/**
 * User Routes
 * Defines API endpoints for user operations
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { validateUserInput, validateLoginInput } = require('../middlewares/validation');
const { uploadAvatar } = require('../config/multer');
const userController = require('../controllers/userController');

// Public routes
router.post('/register', validateUserInput, userController.register);
router.post('/login', validateLoginInput, userController.login);
router.post('/refresh-token', userController.refreshToken);

// Protected routes
router.post('/logout', protect, userController.logout);
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, validateUserInput, userController.updateProfile);
router.put('/avatar', protect, uploadAvatar.single('avatar'), userController.updateAvatar);
router.put('/change-password', protect, userController.changePassword);
router.get('/search', protect, userController.searchUsers);
router.get('/:userId', protect, userController.getUserById);

module.exports = router;
