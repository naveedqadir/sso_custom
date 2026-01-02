const express = require('express');
const router = express.Router();
const {
  getMe,
  logout,
  verifyTokenHandler
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.post('/logout', logout);
router.get('/verify', verifyTokenHandler);

module.exports = router;
