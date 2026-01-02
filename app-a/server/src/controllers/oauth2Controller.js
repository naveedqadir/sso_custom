const OAuthClient = require('../models/OAuthClient');
const User = require('../models/User');
const {
  generateAuthorizationCode,
  validateAuthorizationCode,
  generateAccessToken,
  generateIdToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  verifyAccessToken
} = require('../utils/oauth2Utils');
const config = require('../config');

/**
 * OAuth 2.0 Authorization Server Controller
 * Implements RFC 6749 (OAuth 2.0) and OpenID Connect Core 1.0
 */

// GET /oauth/authorize - Authorization Endpoint (RFC 6749 Section 3.1)
const authorize = async (req, res) => {
  try {
    const {
      response_type,
      client_id,
      redirect_uri,
      scope = 'openid profile email',
      state,
      code_challenge,
      code_challenge_method = 'S256',
      nonce, // OIDC
      prompt // OIDC: 'none' for silent authentication
    } = req.query;

    // Validate required parameters
    if (!response_type || !client_id || !redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters: response_type, client_id, redirect_uri'
      });
    }

    // Only support authorization code flow
    if (response_type !== 'code') {
      return res.status(400).json({
        error: 'unsupported_response_type',
        error_description: 'Only authorization code flow is supported'
      });
    }

    // Validate client
    const client = await OAuthClient.findOne({ clientId: client_id, isActive: true });
    if (!client) {
      return res.status(400).json({
        error: 'invalid_client',
        error_description: 'Client not found or inactive'
      });
    }

    // Validate redirect URI (prevent open redirector attacks)
    if (!client.isValidRedirectUri(redirect_uri)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri'
      });
    }

    // PKCE required for public clients
    if (client.requirePkce && !code_challenge) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'PKCE code_challenge required'
      });
    }

    // Check if user is authenticated (via session/cookie from App A)
    if (!req.user) {
      // If prompt=none (silent auth), return error - user must be logged in
      if (prompt === 'none') {
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('error', 'login_required');
        redirectUrl.searchParams.set('error_description', 'User is not authenticated');
        if (state) {
          redirectUrl.searchParams.set('state', state);
        }
        return res.redirect(redirectUrl.toString());
      }
      
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/login?returnUrl=${returnUrl}`);
    }

    // For first-party trusted clients, auto-approve (no consent screen needed)
    // Generate authorization code
    const code = await generateAuthorizationCode({
      clientId: client_id,
      userId: req.user._id,
      redirectUri: redirect_uri,
      scope,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      state,
      nonce
    });

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
};

// POST /oauth/token - Token Endpoint (RFC 6749 Section 3.2)
const token = async (req, res) => {
  try {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier, // PKCE
      refresh_token
    } = req.body;

    // Validate grant type
    if (!grant_type) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing grant_type'
      });
    }

    // Get client credentials from body or Authorization header
    let clientId = client_id;
    let clientSecret = client_secret;

    // Check Authorization header (Basic auth)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      const [headerClientId, headerClientSecret] = credentials.split(':');
      clientId = clientId || headerClientId;
      clientSecret = clientSecret || headerClientSecret;
    }

    // Validate client
    const client = await OAuthClient.findOne({ clientId }).select('+clientSecret');
    if (!client || !client.isActive) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      });
    }

    // Verify client secret for confidential clients
    if (client.clientType === 'confidential') {
      if (!clientSecret || client.clientSecret !== clientSecret) {
        return res.status(401).json({
          error: 'invalid_client',
          error_description: 'Client authentication failed'
        });
      }
    }

    // Handle different grant types
    if (grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(req, res, client, { code, redirect_uri, code_verifier });
    } else if (grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(req, res, client, { refresh_token });
    } else {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Grant type not supported'
      });
    }
  } catch (error) {
    console.error('Token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
};

// Handle Authorization Code Grant
const handleAuthorizationCodeGrant = async (req, res, client, { code, redirect_uri, code_verifier }) => {
  if (!code || !redirect_uri) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing code or redirect_uri'
    });
  }

  // Validate authorization code
  const result = await validateAuthorizationCode(code, client.clientId, redirect_uri, code_verifier);
  
  if (!result.valid) {
    return res.status(400).json({
      error: result.error,
      error_description: result.error_description
    });
  }

  const { user, scope, nonce } = result;

  // Generate tokens
  const accessToken = generateAccessToken(user, client.clientId, scope);
  const refreshToken = await generateRefreshToken(user._id, client.clientId, scope);
  
  // Generate ID token if openid scope requested (OIDC)
  let idToken = null;
  if (scope.includes('openid')) {
    idToken = generateIdToken(user, client.clientId, nonce);
  }

  // Return tokens (RFC 6749 Section 5.1)
  const response = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour
    refresh_token: refreshToken,
    scope
  };

  if (idToken) {
    response.id_token = idToken;
  }

  res.json(response);
};

// Handle Refresh Token Grant
const handleRefreshTokenGrant = async (req, res, client, { refresh_token }) => {
  if (!refresh_token) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing refresh_token'
    });
  }

  const result = await validateRefreshToken(refresh_token, client.clientId);
  
  if (!result.valid) {
    return res.status(400).json({
      error: result.error,
      error_description: result.error_description
    });
  }

  const { user, scope } = result;

  // Generate new access token
  const accessToken = generateAccessToken(user, client.clientId, scope);

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    scope
  });
};

// GET /oauth/userinfo - UserInfo Endpoint (OIDC Core 1.0 Section 5.3)
const userinfo = async (req, res) => {
  try {
    // Get access token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid access token'
      });
    }

    const accessToken = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(accessToken);

    if (!decoded) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Access token is invalid or expired'
      });
    }

    // Get user info
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'User not found'
      });
    }

    // Return user info based on scopes
    const scope = decoded.scope || '';
    const userInfo = {
      sub: user._id.toString()
    };

    if (scope.includes('profile')) {
      userInfo.name = user.name;
    }

    if (scope.includes('email')) {
      userInfo.email = user.email;
      userInfo.email_verified = true; // Simplified
    }

    res.json(userInfo);
  } catch (error) {
    console.error('UserInfo error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
};

// POST /oauth/revoke - Token Revocation (RFC 7009)
const revoke = async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing token'
      });
    }

    // Revoke refresh token
    await revokeRefreshToken(token);

    // Return 200 OK even if token not found (RFC 7009)
    res.status(200).send();
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
};

// GET /.well-known/openid-configuration - Discovery Document (OIDC Discovery 1.0)
const discovery = async (req, res) => {
  const baseUrl = config.issuer || `${req.protocol}://${req.get('host')}`;
  
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: ['sub', 'name', 'email', 'email_verified'],
    code_challenge_methods_supported: ['S256', 'plain']
  });
};

// GET /.well-known/jwks.json - JSON Web Key Set (for token verification)
const jwks = async (req, res) => {
  // For HS256, we don't expose the key. In production with RS256, this would return public keys
  res.json({
    keys: []
  });
};

module.exports = {
  authorize,
  token,
  userinfo,
  revoke,
  discovery,
  jwks
};
