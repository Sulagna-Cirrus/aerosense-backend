const profileService = require('../services/profiles/profileService');

/**
 * Get user profile controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfile = async (req, res) => {
  try {
    const profile = await profileService.getProfileByUserId(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(err.message === 'Profile not found' ? 404 : 500).json({
      message: err.message === 'Profile not found' ? err.message : 'Server error',
      error: err.message
    });
  }
};

/**
 * Update user profile controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res) => {
  try {
    const { bio, phone, address } = req.body;
    const updatedProfile = await profileService.updateProfile(req.user.id, { bio, phone, address });
    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};

/**
 * Update profile image controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided'
      });
    }

    const updatedProfile = await profileService.updateProfileImage(req.user.id, req.file);
    res.json({
      message: 'Profile image updated successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('Update profile image error:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message
    });
  }
};
