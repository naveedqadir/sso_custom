const mongoose = require('mongoose');

// OAuth 2.0 Authorization Code
// Short-lived code exchanged for tokens (OAuth 2.0 standard)
const authorizationCodeSchema = new mongoose.Schema({
  code: {
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
  
  redirectUri: {
    type: String,
    required: true
  },
  
  // Scopes granted by user
  scope: {
    type: String,
    required: true
  },
  
  // PKCE - Code Challenge (for public clients)
  codeChallenge: {
    type: String
  },
  codeChallengeMethod: {
    type: String,
    enum: ['S256', 'plain'],
    default: 'S256'
  },
  
  // State parameter (CSRF protection - stored for verification)
  state: {
    type: String
  },
  
  // Nonce for OpenID Connect
  nonce: {
    type: String
  },
  
  used: {
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

authorizationCodeSchema.methods.isValid = function() {
  return !this.used && new Date() < this.expiresAt;
};

module.exports = mongoose.model('AuthorizationCode', authorizationCodeSchema);
