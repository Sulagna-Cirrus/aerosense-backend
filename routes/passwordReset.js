const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');

/**
 * Password reset routes
 * - /password-reset/forgot: Request OTP for password reset
 * - /password-reset/verify: Verify OTP
 * - /password-reset/reset: Reset password with verified OTP
 */
router.post('/forgot', passwordResetController.requestOTP);
router.post('/verify', passwordResetController.verifyOTP);
router.post('/reset', passwordResetController.resetPassword);

module.exports = router;
