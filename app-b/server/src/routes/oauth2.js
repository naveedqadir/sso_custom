const express = require('express');
const router = express.Router();
const {
  initiateOAuth,
  handleOAuthCallback,
  handleFrontendOAuthCallback,
  refreshAccessToken,
  oauthLogout
} = require('../controllers/oauth2Controller');
const { protect } = require('../middleware/auth');

/**
 * OAuth 2.0 Client Routes for App B
 * 
 * These routes implement the OAuth 2.0 client side:
 * - GET /login - Initiate OAuth flow (redirect to App A) - Server-side flow
 * - GET /callback - Handle callback from App A - Server-side flow
 * - POST /callback - Handle callback from frontend - Client-side PKCE flow
 * - POST /refresh - Refresh access token
 * - POST /logout - Logout and revoke tokens
 */

// Initiate OAuth login (redirect to App A) - Server-side flow
router.get('/login', initiateOAuth);

// OAuth callback (receives authorization code) - Server-side flow
router.get('/callback', handleOAuthCallback);

// OAuth callback from frontend (with PKCE code verifier) - Client-side flow
router.post('/callback', handleFrontendOAuthCallback);

// Refresh access token
router.post('/refresh', refreshAccessToken);

// Logout with token revocation
router.post('/logout', oauthLogout);

module.exports = router;
