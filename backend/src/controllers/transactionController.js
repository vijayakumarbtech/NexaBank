const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { createOTP, verifyOTP } = require('../services/otpService');
const { analyzeTransaction, logFraudAnalysis, updateUserRiskScore } = require('../services/fraudService');
const { addBlock } = require('../services/blockchainService');
const { notifyFraudAlert, notifyTransactionUpdate } = require('../services/notificationService');
const { emitTransactionUpdate, emitFraudAlert } = require('../services/socketService');
const logger = require('../utils/logger');

const getRequestMeta = (req) => ({
  ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
  deviceInfo: req.headers['user-agent'] || 'Unknown',
  locationMismatch: false // In production, compare with user's known locations
});

// Initiate transaction (Step 1)
exports.initiateTransaction = async (req, res, next) => {
  try {
    const { type, amount, receiverAccountNumber, description } = req.body;
    const sender = req.user;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }

    if (type !== 'DEPOSIT' && sender.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    let receiver = null;
    if (type === 'TRANSFER' && receiverAccountNumber) {
      receiver = await User.findOne({ accountNumber: receiverAccountNumber });
      if (!receiver) {
        return res.status(404).json({ success: false, message: 'Receiver account not found.' });
      }
      if (receiver._id.toString() === sender._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot transfer to own account.' });
      }
    }

    const meta = getRequestMeta(req);
    const transactionId = uuidv4();

    // Create transaction
    const transaction = await Transaction.create({
      transactionId,
      sender: sender._id,
      receiver: receiver?._id,
      receiverAccountNumber,
      type,
      amount,
      description,
      status: 'OTP_PENDING',
      ipAddress: meta.ipAddress,
      deviceInfo: meta.deviceInfo
    });

    // Generate OTP for transaction
    const otp = await createOTP(sender._id, 'TRANSACTION', transactionId);
    logger.info(`Transaction OTP for user ${sender._id}: ${otp}`);

    res.status(201).json({
      success: true,
      message: 'Transaction initiated. OTP sent for verification.',
      transactionId: transaction.transactionId,
      requireOtp: true
    });
  } catch (error) {
    next(error);
  }
};

// Verify OTP and process transaction (Step 2)
exports.verifyAndProcess = async (req, res, next) => {
  try {
    const { transactionId, otp } = req.body;
    const user = req.user;

    const transaction = await Transaction.findOne({ transactionId, sender: user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (transaction.status !== 'OTP_PENDING') {
      return res.status(400).json({ success: false, message: 'Transaction is not in OTP pending state.' });
    }

    // Verify OTP
    const otpResult = await verifyOTP(user._id, otp, 'TRANSACTION');
    if (!otpResult.success) {
      return res.status(400).json({ success: false, message: otpResult.message });
    }

    // Fraud analysis
    const meta = getRequestMeta(req);
    const fraudResult = await analyzeTransaction(transaction, user, meta);
    await logFraudAnalysis(transactionId, user._id, fraudResult);
    await updateUserRiskScore(user._id, fraudResult.riskScore, fraudResult.riskLevel);

    transaction.fraudScore = fraudResult.riskScore;
    transaction.fraudLevel = fraudResult.riskLevel;
    transaction.fraudDetails = fraudResult;

    // Handle based on risk level
    if (fraudResult.riskLevel === 'BLOCKED') {
      transaction.status = 'FAILED';
      await transaction.save();

      await notifyFraudAlert(user._id, transactionId, fraudResult.riskLevel, transaction.amount);
      emitFraudAlert(user._id.toString(), {
        transactionId,
        riskLevel: fraudResult.riskLevel,
        amount: transaction.amount,
        flags: fraudResult.flags
      });

      return res.status(403).json({
        success: false,
        message: 'Transaction blocked due to high fraud risk.',
        riskLevel: fraudResult.riskLevel,
        flags: fraudResult.flags
      });
    }

    if (fraudResult.riskLevel === 'HIGH_RISK') {
      transaction.status = 'PENDING';
      transaction.requiresApproval = true;
      await transaction.save();

      await notifyFraudAlert(user._id, transactionId, fraudResult.riskLevel, transaction.amount);
      emitFraudAlert(user._id.toString(), {
        transactionId,
        riskLevel: fraudResult.riskLevel,
        amount: transaction.amount
      });

      return res.json({
        success: true,
        message: 'Transaction flagged for manual review. Awaiting manager approval.',
        status: 'PENDING',
        requiresApproval: true,
        transactionId
      });
    }

    // Execute transaction for SAFE/SUSPICIOUS
    await executeTransaction(transaction, user);

    res.json({
      success: true,
      message: 'Transaction completed successfully.',
      transaction: {
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        type: transaction.type,
        fraudScore: fraudResult.riskScore,
        fraudLevel: fraudResult.riskLevel
      }
    });
  } catch (error) {
    next(error);
  }
};

const executeTransaction = async (transaction, senderUser) => {
  const session = await Transaction.startSession();
  session.startTransaction();

  try {
    // Deduct from sender (except deposits)
    if (transaction.type !== 'DEPOSIT') {
      await User.findByIdAndUpdate(
        transaction.sender,
        { $inc: { balance: -transaction.amount } },
        { session }
      );
    }

    // Add to receiver for transfers
    if (transaction.type === 'TRANSFER' && transaction.receiver) {
      await User.findByIdAndUpdate(
        transaction.receiver,
        { $inc: { balance: transaction.amount } },
        { session }
      );
    }

    // Add to sender for deposits
    if (transaction.type === 'DEPOSIT') {
      await User.findByIdAndUpdate(
        transaction.sender,
        { $inc: { balance: transaction.amount } },
        { session }
      );
    }

    transaction.status = 'COMPLETED';
    transaction.completedAt = new Date();
    await transaction.save({ session });

    await session.commitTransaction();

    // Add to blockchain
    await addBlock({
      type: 'TRANSACTION',
      transactionId: transaction.transactionId,
      senderId: transaction.sender,
      receiverId: transaction.receiver,
      amount: transaction.amount,
      status: 'COMPLETED',
      timestamp: new Date().toISOString()
    });

    emitTransactionUpdate(transaction.sender.toString(), {
      transactionId: transaction.transactionId,
      status: 'COMPLETED',
      amount: transaction.amount
    });

    await notifyTransactionUpdate(transaction.sender, transaction.transactionId, 'COMPLETED', transaction.amount);
  } catch (error) {
    await session.abortTransaction();
    transaction.status = 'FAILED';
    await transaction.save();
    throw error;
  } finally {
    session.endSession();
  }
};

// Get user transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const query = { sender: req.user._id };

    if (status) query.status = status;
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('receiver', 'firstName lastName accountNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// Get single transaction
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      sender: req.user._id
    }).populate('receiver', 'firstName lastName accountNumber');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
};

// Manager: Approve/Reject pending transaction
exports.reviewTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { action, reason } = req.body; // action: 'APPROVE' or 'REJECT'

    const transaction = await Transaction.findOne({ transactionId, requiresApproval: true, status: 'PENDING' });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Pending transaction not found.' });
    }

    if (action === 'APPROVE') {
      const sender = await User.findById(transaction.sender);
      await executeTransaction(transaction, sender);

      transaction.approvedBy = req.user._id;
      transaction.approvedAt = new Date();
      await transaction.save();

      await notifyTransactionUpdate(transaction.sender, transactionId, 'APPROVED', transaction.amount);
    } else if (action === 'REJECT') {
      transaction.status = 'FAILED';
      transaction.rejectedBy = req.user._id;
      transaction.rejectedAt = new Date();
      transaction.rejectionReason = reason;
      await transaction.save();

      await notifyTransactionUpdate(transaction.sender, transactionId, 'REJECTED', transaction.amount);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }

    res.json({ success: true, message: `Transaction ${action.toLowerCase()}d successfully.` });
  } catch (error) {
    next(error);
  }
};

// Get pending approvals (manager)
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ requiresApproval: true, status: 'PENDING' })
      .populate('sender', 'firstName lastName email accountNumber riskScore')
      .populate('receiver', 'firstName lastName accountNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};

exports.executeTransaction = executeTransaction;
