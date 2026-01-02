const express = require('express');
const router = express.Router();
const {
  exchangeAuthCode,
  refreshAccessToken,
  oauthLogout,
  getMe
} = require('../controllers/oauth2Controller');

/**
 * OAuth 2.0 Client Routes for App B
 * 
 * Client-side PKCE flow (frontend handles PKCE generation):
 * - POST /callback - Exchange authorization code for tokens
 * - POST /refresh - Refresh access token
 * - POST /logout - Logout and revoke tokens
 * - GET /me - Get current user
 */

// Exchange authorization code for tokens (frontend PKCE flow)
router.post('/callback', exchangeAuthCode);

// Refresh access token
router.post('/refresh', refreshAccessToken);

// Logout with token revocation
router.post('/logout', oauthLogout);

// Get current user
router.get('/me', getMe);

module.exports = router;
