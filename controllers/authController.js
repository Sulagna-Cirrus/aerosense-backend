const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authService = require('../services/auth/authService');

/**
 * User signup controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);

    // Use auth service for user registration
    const result = await authService.registerUser(req.body);

    console.log('User created successfully:', { id: result.user.id, email: result.user.email });

    // Return success response with user data
    res.status(201).json({
      message: 'User registered successfully with profile.',
      user: result.user,
      profile: result.profile
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(err.message === 'Email already in use' ? 409 : 500).json({
      message: err.message === 'Email already in use' ? err.message : 'Server error',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * User login controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  try {
    console.log('Login request received:', { 
      email: req.body.email, 
      passwordLength: req.body.password ? req.body.password.length : 0 
    });

    // Use auth service for user authentication
    const result = await authService.authenticateUser(req.body);
    
    console.log('Login successful for:', req.body.email);
    
    // Return token and user data
    res.json(result);
  } catch (err) {
    console.error('Login error details:', { 
      error: err.message, 
      email: req.body.email,
      stack: err.stack
    });
    
    res.status(err.message === 'Invalid credentials' ? 401 : 500).json({ 
      message: err.message === 'Invalid credentials' ? err.message : 'Server error', 
      error: err.message 
    });
  }
};

/**
 * Get user profile controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.profile = async (req, res) => {
  try {
    // Get user profile from service
    const userData = await authService.getUserProfile(req.user.id);
    res.json(userData);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(err.message === 'User not found' ? 404 : 500).json({ 
      message: err.message === 'User not found' ? err.message : 'Server error', 
      error: err.message 
    });
  }
};