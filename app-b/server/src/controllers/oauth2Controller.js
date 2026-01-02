const { generateToken, verifyToken } = require('../utils/tokenUtils');
const {
  exchangeCodeForTokens,
  getUserInfo,
  revokeToken
} = require('../utils/oauth2Client');
const config = require('../config');

/**
 * OAuth 2.0 Client Controller for App B
 * Handles client-side PKCE flow (frontend generates code_verifier)
 */

// POST /oauth/callback - Exchange authorization code for tokens
const exchangeAuthCode = async (req, res) => {
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

// GET /oauth/me - Get current user from token
const getMe = async (req, res) => {
  try {
    let token;

    // Get token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.appb_token) {
      token = req.cookies.appb_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid or expired'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          source: decoded.source
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }
};

module.exports = {
  exchangeAuthCode,
  refreshAccessToken,
  oauthLogout,
  getMe
};
