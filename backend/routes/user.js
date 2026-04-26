const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/balance', userController.getBalance);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/read', userController.markNotificationRead);
router.get('/risk', userController.getUserRisk);

module.exports = router;
