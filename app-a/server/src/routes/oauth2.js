const express = require('express');
const router = express.Router();
const {
  authorize,
  token,
  userinfo,
  revoke,
  discovery,
  jwks
} = require('../controllers/oauth2Controller');
const { protect } = require('../middleware/auth');

/**
 * OAuth 2.0 / OpenID Connect Routes
 * 
 * Standard OAuth 2.0 endpoints as per RFC 6749:
 * - /oauth/authorize - Authorization endpoint
 * - /oauth/token - Token endpoint
 * - /oauth/userinfo - UserInfo endpoint (OIDC)
 * - /oauth/revoke - Token revocation (RFC 7009)
 * 
 * Discovery endpoints (OIDC Discovery 1.0):
 * - /.well-known/openid-configuration
 * - /.well-known/jwks.json
 */

// Discovery endpoints (public)
router.get('/.well-known/openid-configuration', discovery);
router.get('/.well-known/jwks.json', jwks);

// Authorization endpoint (requires user to be logged in)
router.get('/oauth/authorize', protect, authorize);

// Token endpoint (public - uses client credentials)
router.post('/oauth/token', token);

// UserInfo endpoint (requires valid access token)
router.get('/oauth/userinfo', userinfo);

// Token revocation endpoint
router.post('/oauth/revoke', revoke);

module.exports = router;
