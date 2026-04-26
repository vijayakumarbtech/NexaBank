const { v4: uuidv4 } = require('uuid');
const { Payment } = require('../models');
const User = require('../models/User');
const { notifyPaymentUpdate } = require('../services/notificationService');
const { emitPaymentUpdate } = require('../services/socketService');
const { addBlock } = require('../services/blockchainService');
const logger = require('../utils/logger');

// Simulate payment processing (80% success rate)
const simulatePaymentGateway = async (amount, cardLast4) => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const success = Math.random() < 0.8;
  return {
    success,
    gatewayRef: uuidv4(),
    failureReason: success ? null : 'Card declined by issuing bank'
  };
};

const detectCardBrand = (cardNumber) => {
  const num = cardNumber.replace(/\s/g, '');
  if (/^4/.test(num)) return 'Visa';
  if (/^5[1-5]/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'Amex';
  if (/^6(?:011|5)/.test(num)) return 'Discover';
  return 'Unknown';
};

// Process payment
exports.processPayment = async (req, res, next) => {
  try {
    const { amount, cardNumber, cardExpiry, cardCvv, description } = req.body;
    const user = req.user;

    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      return res.status(400).json({ success: false, message: 'Invalid card number.' });
    }

    if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      return res.status(400).json({ success: false, message: 'Invalid expiry date. Use MM/YY format.' });
    }

    if (!cardCvv || !/^\d{3,4}$/.test(cardCvv)) {
      return res.status(400).json({ success: false, message: 'Invalid CVV.' });
    }

    const cardLast4 = cardNumber.replace(/\s/g, '').slice(-4);
    const cardBrand = detectCardBrand(cardNumber);
    const paymentId = 'PAY-' + uuidv4().substring(0, 8).toUpperCase();

    // Create payment record
    const payment = await Payment.create({
      paymentId,
      userId: user._id,
      amount,
      cardLast4,
      cardBrand,
      status: 'PENDING',
      description
    });

    // Emit pending status
    emitPaymentUpdate(user._id.toString(), {
      paymentId,
      status: 'PENDING',
      amount
    });

    // Simulate gateway processing
    const gatewayResult = await simulatePaymentGateway(amount, cardLast4);

    if (gatewayResult.success) {
      // Deduct from balance
      await User.findByIdAndUpdate(user._id, { $inc: { balance: -amount } });

      payment.status = 'SUCCESS';
      payment.processedAt = new Date();
      await payment.save();

      // Add to blockchain
      await addBlock({
        type: 'PAYMENT',
        paymentId,
        userId: user._id.toString(),
        amount,
        cardLast4,
        cardBrand,
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      emitPaymentUpdate(user._id.toString(), { paymentId, status: 'SUCCESS', amount });
      await notifyPaymentUpdate(user._id, paymentId, 'SUCCESS', amount);

      return res.json({
        success: true,
        message: 'Payment processed successfully.',
        payment: {
          paymentId,
          status: 'SUCCESS',
          amount,
          cardLast4,
          cardBrand
        }
      });
    } else {
      payment.status = 'FAILED';
      payment.failureReason = gatewayResult.failureReason;
      payment.processedAt = new Date();
      await payment.save();

      emitPaymentUpdate(user._id.toString(), { paymentId, status: 'FAILED', amount, reason: gatewayResult.failureReason });
      await notifyPaymentUpdate(user._id, paymentId, 'FAILED', amount);

      return res.status(402).json({
        success: false,
        message: 'Payment failed.',
        reason: gatewayResult.failureReason,
        paymentId
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get payment history
exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      payments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};
