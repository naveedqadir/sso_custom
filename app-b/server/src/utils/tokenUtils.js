const jwt = require('jsonwebtoken');
const config = require('../config');

// Generate local JWT token for App B
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      name: user.name,
      source: 'oauth' // Mark as OAuth 2.0 authenticated
    }, 
    config.jwtSecret, 
    { expiresIn: config.jwtExpiresIn }
  );
};

// Verify local JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};
