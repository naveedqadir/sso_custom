const mongoose = require('mongoose');

// OAuth 2.0 Refresh Token
// Long-lived token to get new access tokens
const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  clientId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  scope: {
    type: String,
    required: true
  },
  
  // Token can be revoked
  revoked: {
    type: Boolean,
    default: false
  },
  
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

refreshTokenSchema.methods.isValid = function() {
  return !this.revoked && new Date() < this.expiresAt;
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
