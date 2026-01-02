const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const config = require('./config');
const authRoutes = require('./routes/auth');
const oauth2Routes = require('./routes/oauth2');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS configuration
const corsOptions = {
  origin: [config.clientUrl, config.appBUrl, 'http://localhost:3001', 'http://localhost:3002'],
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
  res.json({ status: 'OK', app: 'App A - OAuth 2.0 Authorization Server' });
});

// OAuth 2.0 / OpenID Connect routes (must be before /api routes)
app.use('/', oauth2Routes);

// Legacy Auth routes (for App A's own login)
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
  console.log(`App A (Auth Server) running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

module.exports = app;
