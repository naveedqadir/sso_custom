const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');

/**
 * OAuth 2.0 Client Utilities for App B
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 */

// Generate PKCE code verifier and challenge (RFC 7636)
const generatePKCE = () => {
  // Code verifier: 43-128 character random string
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // Code challenge: SHA256 hash of verifier (S256 method)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
};

// Generate state parameter for CSRF protection
const generateState = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Build authorization URL
const buildAuthorizationUrl = (params) => {
  const {
    state,
    codeChallenge,
    scope = 'openid profile email',
    nonce
  } = params;
  
  const authUrl = new URL(`${config.appAServerUrl}/oauth/authorize`);
  
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.oauthClientId);
  authUrl.searchParams.set('redirect_uri', config.oauthRedirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  if (nonce) {
    authUrl.searchParams.set('nonce', nonce);
  }
  
  return authUrl.toString();
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code, codeVerifier) => {
  try {
    const response = await axios.post(
      `${config.appAServerUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.oauthRedirectUri,
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret,
        code_verifier: codeVerifier
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'token_exchange_failed',
      error_description: error.response?.data?.error_description || 'Failed to exchange code for tokens'
    };
  }
};

// Get user info from OAuth server
const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(
      `${config.appAServerUrl}/oauth/userinfo`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 5000
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('UserInfo error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'userinfo_failed'
    };
  }
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post(
      `${config.appAServerUrl}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || 'refresh_failed'
    };
  }
};

// Revoke token
const revokeToken = async (token) => {
  try {
    await axios.post(
      `${config.appAServerUrl}/oauth/revoke`,
      new URLSearchParams({ token }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};

module.exports = {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  refreshAccessToken,
  revokeToken
};
