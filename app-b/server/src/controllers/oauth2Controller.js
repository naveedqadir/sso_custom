const { generateToken } = require('../utils/tokenUtils');
const {
  generatePKCE,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  revokeToken
} = require('../utils/oauth2Client');
const config = require('../config');

// In-memory store for PKCE and state (use Redis in production)
const pendingAuth = new Map();

/**
 * OAuth 2.0 Client Controller for App B
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 */

// GET /oauth/login - Initiate OAuth flow (Server-Side Flow)
const initiateOAuth = async (req, res) => {
  try {
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateState();
    const nonce = generateState(); // For OIDC
    
    // Store PKCE verifier and state (expires in 10 minutes)
    pendingAuth.set(state, {
      codeVerifier,
      nonce,
      createdAt: Date.now()
    });
    
    // Clean up old entries
    for (const [key, value] of pendingAuth.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        pendingAuth.delete(key);
      }
    }
    
    // Build authorization URL
    const authUrl = buildAuthorizationUrl({
      state,
      codeChallenge,
      scope: 'openid profile email',
      nonce
    });
    
    // Redirect to OAuth server
    res.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    res.redirect(`${config.clientUrl}?error=oauth_init_failed`);
  }
};

// GET /oauth/callback - Handle OAuth callback (Server-Side Flow)
const handleOAuthCallback = async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Check for OAuth error
    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.redirect(`${config.clientUrl}?error=${error}&error_description=${encodeURIComponent(error_description || '')}`);
    }
    
    // Validate state (CSRF protection)
    if (!state || !pendingAuth.has(state)) {
      return res.redirect(`${config.clientUrl}?error=invalid_state`);
    }
    
    const { codeVerifier, nonce } = pendingAuth.get(state);
    pendingAuth.delete(state); // One-time use
    
    if (!code) {
      return res.redirect(`${config.clientUrl}?error=missing_code`);
    }
    
    // Exchange code for tokens
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);
    
    if (!tokenResult.success) {
      return res.redirect(`${config.clientUrl}?error=${tokenResult.error}`);
    }
    
    const { access_token, refresh_token, id_token, scope } = tokenResult.data;
    
    // Get user info
    const userInfoResult = await getUserInfo(access_token);
    
    if (!userInfoResult.success) {
      return res.redirect(`${config.clientUrl}?error=userinfo_failed`);
    }
    
    const userInfo = userInfoResult.data;
    
    // Create local session for App B
    const user = {
      id: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
      source: 'oauth2'
    };
    
    const localToken = generateToken(user);
    
    // Set cookies
    res.cookie('appb_token', localToken, config.cookieOptions);
    res.cookie('appb_refresh_token', refresh_token, {
      ...config.cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Redirect to frontend with success
    res.redirect(`${config.clientUrl}/oauth/success?token=${localToken}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${config.clientUrl}?error=callback_failed`);
  }
};

// POST /oauth/callback - Handle OAuth callback from frontend (PKCE from client)
// This is for the client-side PKCE flow where the frontend generates the verifier
const handleFrontendOAuthCallback = async (req, res) => {
  try {
    const { code, codeVerifier, state } = req.body;

    // Validate required parameters
    if (!code || !codeVerifier) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters (code, codeVerifier)'
      });
    }

    // Exchange authorization code for tokens at App A
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);

    if (!tokenResult.success) {
      return res.status(400).json({
        success: false,
        message: tokenResult.error || 'Token exchange failed'
      });
    }

    const { access_token, refresh_token, id_token, token_type, expires_in } = tokenResult.data;

    // Get user info from App A
    const userInfoResult = await getUserInfo(access_token);

    if (!userInfoResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to get user information'
      });
    }

    const userInfo = userInfoResult.data;

    // Create local user session for App B
    const user = {
      id: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
      source: 'oauth2'
    };

    // Generate local access token for App B
    const localToken = generateToken(user);

    // Set HTTP-only cookies for extra security
    res.cookie('appb_token', localToken, config.cookieOptions);
    if (refresh_token) {
      res.cookie('appb_refresh_token', refresh_token, {
        ...config.cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    // Return tokens and user info
    res.json({
      success: true,
      data: {
        user,
        accessToken: localToken,
        refreshToken: refresh_token,
        idToken: id_token,
        expiresIn: expires_in
      }
    });
  } catch (error) {
    console.error('Frontend OAuth callback error:', error);
    res.status(500).json({
      success: false,
      message: 'OAuth authentication failed'
    });
  }
};

// POST /oauth/refresh - Refresh access token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const cookieRefreshToken = req.cookies.appb_refresh_token;
    
    const token = refreshToken || cookieRefreshToken;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No refresh token provided'
      });
    }

    // In a real implementation, you would exchange the refresh token
    // with the OAuth server for a new access token
    // For now, we'll just verify the token exists
    
    // This would call App A's token endpoint with grant_type=refresh_token
    // const tokenResult = await refreshTokenWithAuthServer(token);
    
    res.json({
      success: true,
      message: 'Token refresh not fully implemented - use full re-authentication'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};

// POST /oauth/logout - Logout and revoke tokens
const oauthLogout = async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.appb_refresh_token;
    
    // Revoke token at OAuth server
    if (refreshToken) {
      await revokeToken(refreshToken);
    }
    
    // Clear cookies
    res.cookie('appb_token', '', { httpOnly: true, expires: new Date(0) });
    res.cookie('appb_refresh_token', '', { httpOnly: true, expires: new Date(0) });
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

module.exports = {
  initiateOAuth,
  handleOAuthCallback,
  handleFrontendOAuthCallback,
  refreshAccessToken,
  oauthLogout
};
