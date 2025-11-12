const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

// @route   POST /api/auth/register
// @access  Public
router.post('/register', authController.register);

// @route   POST /api/auth/login
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, authController.getMe);

module.exports = router;

