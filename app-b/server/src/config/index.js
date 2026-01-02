const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 5002,
  jwtSecret: process.env.JWT_SECRET || 'app-b-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  appAServerUrl: process.env.APP_A_SERVER_URL || 'http://localhost:5001',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3002',
  appAUrl: process.env.APP_A_URL || 'http://localhost:3001',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OAuth 2.0 Client Configuration
  oauthClientId: process.env.OAUTH_CLIENT_ID || '',
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET || '',
  oauthRedirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3002/oauth/callback',
  
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
};
