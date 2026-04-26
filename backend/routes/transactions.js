const express = require('express');
const router = express.Router();
const txController = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.post('/initiate', txController.initiateTransaction);
router.post('/verify-otp', txController.verifyTransactionOtp);
router.get('/', txController.getTransactions);
router.get('/:id', txController.getTransactionById);
router.post('/manager/approve', authorize('manager', 'admin'), txController.managerApprove);
router.get('/manager/pending', authorize('manager', 'admin'), txController.getPendingApprovals);

module.exports = router;
