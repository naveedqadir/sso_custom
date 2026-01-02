const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 5001,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/oauth_auth',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3001',
  appBUrl: process.env.APP_B_URL || 'http://localhost:3002',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OAuth 2.0 / OIDC configuration
  issuer: process.env.ISSUER || 'http://localhost:5001',
  
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
};
