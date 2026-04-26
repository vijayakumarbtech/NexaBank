// paymentRoutes.js
const express = require('express');
const router = express.Router();
const { processPayment, getPayments } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/process', processPayment);
router.get('/', getPayments);

module.exports = router;
