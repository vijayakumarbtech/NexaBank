const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getUsers, updateUser, getFraudLogs,
  validateBlockchain, getLoginAttempts, getActivityLogs, resolveFraudLog
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:userId', authorize('admin'), updateUser);
router.get('/fraud-logs', getFraudLogs);
router.put('/fraud-logs/:logId/resolve', resolveFraudLog);
router.get('/blockchain/validate', validateBlockchain);
router.get('/login-attempts', getLoginAttempts);
router.get('/activity-logs', authorize('admin'), getActivityLogs);

module.exports = router;
