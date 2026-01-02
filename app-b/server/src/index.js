const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const authRoutes = require('./routes/auth');
const oauth2Routes = require('./routes/oauth2');

// Initialize express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: [config.clientUrl, config.appAUrl, 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', app: 'App B - OAuth 2.0 Client' });
});

// OAuth 2.0 client routes (mounted at /oauth)
app.use('/oauth', oauth2Routes);

// Legacy Auth routes (for backward compatibility)
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Server error'
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`App B (Client Server) running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

module.exports = app;
