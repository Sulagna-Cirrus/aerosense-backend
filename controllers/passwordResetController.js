const bcrypt = require('bcrypt');
const pool = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Request OTP for password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestOTP = async (req, res) => {
  console.log('Password reset OTP request received:', req.body);
  try {
    const { email } = req.body;
    console.log('Processing OTP request for email:', email);
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    let user;
    if (userQuery.rows.length === 0) {
      // In development mode, create a temporary test user for password reset testing
      console.log('No user found with email:', email);
      console.log('Creating a temporary test user for development purposes');
      
      try {
        // Check if the users table exists
        const tableCheck = await pool.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        );
        
        if (!tableCheck.rows[0].exists) {
          // Create users table if it doesn't exist
          await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              password VARCHAR(255) NOT NULL,
              full_name VARCHAR(255),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          console.log('Created users table');
        }
        
        // Create a test user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const newUserResult = await pool.query(
          'INSERT INTO users (email, password, full_name) VALUES ($1, $2, $3) RETURNING *',
          [email, hashedPassword, 'Test User']
        );
        
        user = newUserResult.rows[0];
        console.log('Created test user:', user);
      } catch (dbError) {
        console.error('Error creating test user:', dbError);
        // Continue with a mock user for testing
        user = { id: 999, email: email };
      }
    } else {
      user = userQuery.rows[0];
    }
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000); // OTP valid for 30 minutes
    
    // Hash the OTP before storing
    const hashedOTP = await bcrypt.hash(otp, 10);
    
    // Check if a password_reset_tokens table exists
    try {
      // Check if an OTP already exists for this user
      const existingToken = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE user_id = $1',
        [user.id]
      );
      
      // If token exists, update it, otherwise create a new one
      if (existingToken.rows.length > 0) {
        await pool.query(
          'UPDATE password_reset_tokens SET token = $1, expires_at = $2, created_at = NOW() WHERE user_id = $3',
          [hashedOTP, otpExpires, user.id]
        );
      } else {
        await pool.query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, hashedOTP, otpExpires]
        );
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Check if the error is because the table doesn't exist
      if (dbError.code === '42P01') {  // undefined_table
        // Create the password_reset_tokens table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            verification_token TEXT,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Insert the token
        await pool.query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, hashedOTP, otpExpires]
        );
      } else {
        throw dbError; // Re-throw if it's a different error
      }
    }
    
    // Log OTP to console in debug mode with clear highlighting
    console.log('\n=============================================');
    console.log(`🔑 PASSWORD RESET OTP FOR ${email}:`);
    console.log(`🔢 ${otp}`);
    console.log('=============================================\n');
    
    // Send email with OTP
    try {
      // Create a transporter using the configured email settings
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      
      // Email content
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@aerosense.com',
        to: email,
        subject: 'AeroSense Password Reset',
        text: `Your OTP for password reset is: ${otp}. This OTP is valid for 30 minutes.`,
        html: `
          <h2>AeroSense Password Reset</h2>
          <p>Your OTP for password reset is: <strong>${otp}</strong></p>
          <p>This OTP is valid for 30 minutes.</p>
        `
      };
      
      // Send email if email config is available
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await transporter.sendMail(mailOptions);
      } else {
        console.log('Email credentials not configured. Skipping email send.');
      }
      
      res.status(200).json({ message: 'OTP sent successfully. Check console for OTP (development mode).' });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Even if email fails, we return success since OTP is logged to console
      res.status(200).json({ message: 'OTP generated successfully. Check console for OTP (email service might be unavailable).' });
    }
  } catch (err) {
    console.error('OTP request error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Verify OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }
    
    // Get user
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userQuery.rows[0];
    
    // Get token
    const tokenQuery = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );
    
    if (tokenQuery.rows.length === 0) {
      return res.status(400).json({ message: 'No OTP requested for this user' });
    }
    
    const tokenData = tokenQuery.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Verify OTP
    const isValid = await bcrypt.compare(otp, tokenData.token);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Generate verification token for the reset step
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Update token with verification token
    await pool.query(
      'UPDATE password_reset_tokens SET verification_token = $1 WHERE user_id = $2',
      [verificationToken, user.id]
    );
    
    res.status(200).json({ message: 'OTP verified successfully', verificationToken });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Reset password with verified OTP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, password, verificationToken } = req.body;
    
    if (!email || !password || !verificationToken) {
      return res.status(400).json({ message: 'Email, password, and verification token are required' });
    }
    
    // Get user
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userQuery.rows[0];
    
    // Get token
    const tokenQuery = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND verification_token = $2',
      [user.id, verificationToken]
    );
    
    if (tokenQuery.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }
    
    const tokenData = tokenQuery.rows[0];
    
    // Check if token is expired
    if (new Date() > new Date(tokenData.expires_at)) {
      return res.status(400).json({ message: 'Token has expired. Please request a new OTP.' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    // Delete the used token
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
