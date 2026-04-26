const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId/status', adminController.toggleUserStatus);
router.get('/fraud-logs', adminController.getFraudLogs);
router.get('/blockchain', adminController.getBlockchainLogs);
router.get('/blockchain/validate', adminController.validateBlockchain);
router.get('/activity-logs', adminController.getActivityLogs);
router.get('/login-attempts', adminController.getLoginAttempts);

module.exports = router;
