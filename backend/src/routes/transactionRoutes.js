const express = require('express');
const router = express.Router();
const {
  initiateTransaction, verifyAndProcess, getTransactions, getTransaction,
  reviewTransaction, getPendingApprovals
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/initiate', initiateTransaction);
router.post('/verify', verifyAndProcess);
router.get('/', getTransactions);
router.get('/:transactionId', getTransaction);

// Manager routes
router.get('/pending/approvals', authorize('manager', 'admin'), getPendingApprovals);
router.put('/:transactionId/review', authorize('manager', 'admin'), reviewTransaction);

module.exports = router;
