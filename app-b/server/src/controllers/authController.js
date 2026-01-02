const { generateToken } = require('../utils/tokenUtils');
const config = require('../config');

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.cookie('appb_token', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
const verifyTokenHandler = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
};

module.exports = {
  getMe,
  logout,
  verifyTokenHandler
};
