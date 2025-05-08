const express = require('express');
const { signup, login, profile } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

/**
 * Authentication routes
 * - /auth/signup: Register a new user with automatic profile creation
 * - /auth/login: Authenticate a user and return JWT token
 * - /auth/profile: Get current user profile information
 */
router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', authMiddleware, profile);

module.exports = router;