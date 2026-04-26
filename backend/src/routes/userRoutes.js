// userRoutes.js
const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getBalance, getDashboard, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/balance', getBalance);
router.get('/dashboard', getDashboard);
router.put('/change-password', changePassword);

module.exports = router;
