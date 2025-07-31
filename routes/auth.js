const express = require('express');
const { validateUser, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Register new user
router.post('/register', validateUser, authController.register);

// Login user
router.post('/login', validateLogin, authController.login);

// Get current user profile
router.get('/profile', authenticateToken, authController.getProfile);

// Update user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// Change password
router.put('/change-password', authenticateToken, authController.changePassword);

// Refresh token
router.post('/refresh', authenticateToken, authController.refreshToken);

// Logout (client-side token removal)
router.post('/logout', authenticateToken, authController.logout);

module.exports = router; 