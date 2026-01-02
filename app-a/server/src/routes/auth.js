const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  verifyTokenHandler
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.use(protect); // All routes below this require authentication
router.post('/logout', logout);
router.get('/me', getMe);
router.get('/verify', verifyTokenHandler);

module.exports = router;
