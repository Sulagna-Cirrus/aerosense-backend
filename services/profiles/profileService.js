const pool = require('../../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Create a new user profile
 * @param {Object} client - DB client for transaction support
 * @param {Number} userId - User ID to create profile for
 * @returns {Object} Created profile
 */
const createProfile = async (client, userId) => {
  // If client is provided, use it (for transactions)
  // Otherwise use the pool directly
  const dbClient = client || pool;
  
  const query = `
    INSERT INTO profiles (user_id) 
    VALUES ($1) 
    RETURNING id, user_id, profile_image, bio, phone, address
  `;
  
  const result = await dbClient.query(query, [userId]);
  return formatProfile(result.rows[0]);
};

/**
 * Get user profile by user ID
 * @param {Number} userId - User ID
 * @returns {Object} User profile
 */
const getProfileByUserId = async (userId) => {
  const query = `
    SELECT p.*, u.full_name, u.email 
    FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE p.user_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) {
    throw new Error('Profile not found');
  }
  
  return formatProfile(result.rows[0]);
};

/**
 * Update user profile
 * @param {Number} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Object} Updated profile
 */
const updateProfile = async (userId, profileData) => {
  const { bio, phone, address } = profileData;
  
  // First check if profile exists
  const profileCheck = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  );
  
  if (profileCheck.rows.length === 0) {
    // Create profile if it doesn't exist
    return await createProfile(null, userId);
  }
  
  // Update existing profile
  const query = `
    UPDATE profiles
    SET bio = COALESCE($1, bio),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $4
    RETURNING id, user_id, profile_image, bio, phone, address
  `;
  
  const result = await pool.query(query, [bio, phone, address, userId]);
  return formatProfile(result.rows[0]);
};

/**
 * Update profile image
 * @param {Number} userId - User ID
 * @param {Object} file - Uploaded file
 * @returns {Object} Updated profile
 */
const updateProfileImage = async (userId, file) => {
  // Make sure profile exists
  const profileCheck = await pool.query(
    'SELECT * FROM profiles WHERE user_id = $1',
    [userId]
  );
  
  if (profileCheck.rows.length === 0) {
    // Create profile if it doesn't exist
    await createProfile(null, userId);
  } else {
    // Delete old profile image if it's not the default
    const oldImage = profileCheck.rows[0].profile_image;
    if (oldImage && oldImage !== 'default-profile.png') {
      const oldImagePath = path.join(__dirname, '../../uploads/profiles', oldImage);
      // Check if file exists before attempting to delete
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }
  
  // Update profile with new image
  const query = `
    UPDATE profiles
    SET profile_image = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $2
    RETURNING id, user_id, profile_image, bio, phone, address
  `;
  
  const result = await pool.query(query, [file.filename, userId]);
  return formatProfile(result.rows[0]);
};

/**
 * Format profile data
 * @param {Object} profile - Raw profile data from database
 * @returns {Object} Formatted profile
 */
const formatProfile = (profile) => {
  if (!profile) return null;
  
  return {
    id: profile.id,
    userId: profile.user_id,
    profileImage: profile.profile_image,
    profileImageUrl: `/uploads/profiles/${profile.profile_image}`,
    bio: profile.bio,
    phone: profile.phone,
    address: profile.address,
    fullName: profile.full_name,
    email: profile.email
  };
};

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
  updateProfileImage
};
