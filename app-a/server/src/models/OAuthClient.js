const mongoose = require('mongoose');
const crypto = require('crypto');

// OAuth 2.0 Client Registration
// Each application that wants to use OAuth 2.0 must be registered as a client
const oauthClientSchema = new mongoose.Schema({
  // Client credentials
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  clientSecret: {
    type: String,
    required: true,
    select: false // Don't return in queries by default
  },
  
  // Client metadata
  name: {
    type: String,
    required: true
  },
  
  // Allowed redirect URIs (security - prevent open redirector attacks)
  redirectUris: [{
    type: String,
    required: true
  }],
  
  // Allowed grant types for this client
  grantTypes: [{
    type: String,
    enum: ['authorization_code', 'refresh_token'],
    default: ['authorization_code', 'refresh_token']
  }],
  
  // Allowed scopes
  allowedScopes: [{
    type: String,
    default: ['openid', 'profile', 'email']
  }],
  
  // Client type (confidential = has secret, public = SPA/mobile)
  clientType: {
    type: String,
    enum: ['confidential', 'public'],
    default: 'confidential'
  },
  
  // For PKCE (required for public clients)
  requirePkce: {
    type: Boolean,
    default: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate client credentials
oauthClientSchema.statics.generateCredentials = function() {
  return {
    clientId: crypto.randomBytes(16).toString('hex'),
    clientSecret: crypto.randomBytes(32).toString('hex')
  };
};

// Validate redirect URI
oauthClientSchema.methods.isValidRedirectUri = function(uri) {
  return this.redirectUris.includes(uri);
};

module.exports = mongoose.model('OAuthClient', oauthClientSchema);
