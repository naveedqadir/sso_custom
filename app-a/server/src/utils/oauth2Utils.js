const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const AuthorizationCode = require('../models/AuthorizationCode');
const RefreshToken = require('../models/RefreshToken');

/**
 * OAuth 2.0 Token Utilities
 * Implements RFC 6749 (OAuth 2.0) and RFC 7519 (JWT)
 */

// Generate Authorization Code (RFC 6749 Section 4.1.2)
const generateAuthorizationCode = async (params) => {
  const { clientId, userId, redirectUri, scope, codeChallenge, codeChallengeMethod, state, nonce } = params;
  
  const code = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes (OAuth 2.0 recommendation)
  
  await AuthorizationCode.create({
    code,
    clientId,
    userId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    state,
    nonce,
    expiresAt
  });
  
  return code;
};

// Validate and consume Authorization Code
const validateAuthorizationCode = async (code, clientId, redirectUri, codeVerifier = null) => {
  const authCode = await AuthorizationCode.findOne({ code, clientId }).populate('userId');
  
  if (!authCode) {
    return { valid: false, error: 'invalid_grant', error_description: 'Authorization code not found' };
  }
  
  if (!authCode.isValid()) {
    return { valid: false, error: 'invalid_grant', error_description: 'Authorization code expired or already used' };
  }
  
  // Verify redirect URI matches
  if (authCode.redirectUri !== redirectUri) {
    return { valid: false, error: 'invalid_grant', error_description: 'Redirect URI mismatch' };
  }
  
  // PKCE verification (RFC 7636)
  if (authCode.codeChallenge) {
    if (!codeVerifier) {
      return { valid: false, error: 'invalid_grant', error_description: 'Code verifier required' };
    }
    
    let computedChallenge;
    if (authCode.codeChallengeMethod === 'S256') {
      computedChallenge = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
    } else {
      computedChallenge = codeVerifier;
    }
    
    if (computedChallenge !== authCode.codeChallenge) {
      return { valid: false, error: 'invalid_grant', error_description: 'Code verifier invalid' };
    }
  }
  
  // Mark as used (one-time use)
  authCode.used = true;
  await authCode.save();
  
  return { 
    valid: true, 
    user: authCode.userId, 
    scope: authCode.scope,
    nonce: authCode.nonce 
  };
};

// Generate Access Token (JWT format as per RFC 9068)
const generateAccessToken = (user, clientId, scope) => {
  const payload = {
    // Standard JWT claims
    iss: config.issuer || 'http://localhost:5001', // Issuer
    sub: user._id.toString(), // Subject (user ID)
    aud: clientId, // Audience (client ID)
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour expiry
    iat: Math.floor(Date.now() / 1000), // Issued at
    jti: uuidv4(), // JWT ID (unique identifier)
    
    // OAuth 2.0 claims
    scope: scope,
    client_id: clientId,
    
    // Custom claims
    token_type: 'access_token'
  };
  
  return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' });
};

// Generate ID Token (OpenID Connect Core 1.0)
const generateIdToken = (user, clientId, nonce = null) => {
  const payload = {
    // Required OIDC claims
    iss: config.issuer || 'http://localhost:5001',
    sub: user._id.toString(),
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
    iat: Math.floor(Date.now() / 1000),
    
    // User profile claims (based on scope)
    name: user.name,
    email: user.email,
    
    // Nonce (replay protection)
    ...(nonce && { nonce })
  };
  
  return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256' });
};

// Generate Refresh Token
const generateRefreshToken = async (userId, clientId, scope) => {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  await RefreshToken.create({
    token,
    clientId,
    userId,
    scope,
    expiresAt
  });
  
  return token;
};

// Validate Refresh Token
const validateRefreshToken = async (token, clientId) => {
  const refreshToken = await RefreshToken.findOne({ token, clientId }).populate('userId');
  
  if (!refreshToken || !refreshToken.isValid()) {
    return { valid: false, error: 'invalid_grant', error_description: 'Invalid refresh token' };
  }
  
  return { valid: true, user: refreshToken.userId, scope: refreshToken.scope };
};

// Revoke Refresh Token
const revokeRefreshToken = async (token) => {
  await RefreshToken.updateOne({ token }, { revoked: true });
};

// Verify Access Token
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.token_type !== 'access_token') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAuthorizationCode,
  validateAuthorizationCode,
  generateAccessToken,
  generateIdToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken
};
