// authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, verifyLoginOTP, verifyEmail, refreshToken, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');

router.post('/register', [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], register);

router.post('/verify-email', verifyEmail);
router.post('/login', [body('email').isEmail(), body('password').notEmpty()], login);
router.post('/verify-otp', verifyLoginOTP);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
