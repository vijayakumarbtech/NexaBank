const { v4: uuidv4 } = require('uuid');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { createOtp, verifyOtp } = require('../services/otpService');
const { analyzeTransaction, logFraudAnalysis, auditToBlockchain } = require('../services/fraudService');

exports.initiateTransaction = async (req, res) => {
  try {
    const { toAccountNumber, amount, type, description } = req.body;
    const fromUserId = req.user._id;

    if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be positive' });

    const fromUser = await User.findById(fromUserId);
    if (!fromUser || fromUser.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    let toUser = null;
    if (toAccountNumber) {
      toUser = await User.findOne({ accountNumber: toAccountNumber });
      if (!toUser) return res.status(404).json({ success: false, message: 'Recipient account not found' });
      if (toUser._id.toString() === fromUserId.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot transfer to own account' });
      }
    }

    const transactionId = 'TXN' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16);

    const transaction = await Transaction.create({
      transactionId,
      fromUser: fromUserId,
      toUser: toUser?._id,
      amount,
      type: type || 'transfer',
      status: 'OTP_PENDING',
      description,
      ipAddress: req.ip,
      deviceInfo: req.headers['user-agent']
    });

    // Send OTP
    const { otp } = await createOtp(fromUserId, 'transaction', transactionId);

    res.json({
      success: true,
      message: 'Transaction initiated. OTP sent for verification.',
      transactionId,
      requiresOtp: true,
      otp // In production: remove, send via SMS
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyTransactionOtp = async (req, res) => {
  try {
    const { transactionId, otp } = req.body;
    const userId = req.user._id;

    const otpResult = await verifyOtp(userId, otp, 'transaction', transactionId);
    if (!otpResult.valid) {
      return res.status(400).json({ success: false, message: otpResult.reason });
    }

    const transaction = await Transaction.findOne({ transactionId, fromUser: userId });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    transaction.status = 'FRAUD_CHECK';
    await transaction.save();

    // Run fraud analysis
    const mlResult = await analyzeTransaction(userId, transaction.amount, req.ip, req.headers['user-agent']);

    transaction.riskScore = mlResult.risk_score;
    transaction.riskLevel = mlResult.risk_level;
    transaction.fraudProbability = mlResult.fraud_probability;
    transaction.riskFactors = mlResult.risk_factors || [];

    let action = 'ALLOWED';

    if (mlResult.risk_level === 'BLOCKED') {
      transaction.status = 'BLOCKED';
      action = 'BLOCKED';
      // Update fraud flags on user
      await User.findByIdAndUpdate(userId, { $inc: { previousFraudFlags: 1 } });
    } else if (mlResult.risk_level === 'HIGH_RISK' || mlResult.risk_level === 'SUSPICIOUS') {
      transaction.status = 'MANAGER_REVIEW';
      transaction.requiresManagerApproval = true;
      action = 'MANAGER_REVIEW';
    } else {
      // Execute transaction immediately
      await executeTransaction(transaction);
      action = 'ALLOWED';
    }

    await transaction.save();
    await logFraudAnalysis(userId, transactionId, mlResult, action);
    await auditToBlockchain('TRANSACTION_FRAUD_CHECK', userId, { transactionId, riskLevel: mlResult.risk_level, action });

    // Notify user
    const notifTitle = transaction.status === 'BLOCKED' ? 'Transaction Blocked' :
      transaction.status === 'MANAGER_REVIEW' ? 'Transaction Under Review' : 'Transaction Successful';

    await Notification.create({
      userId,
      type: transaction.status === 'BLOCKED' || transaction.status === 'MANAGER_REVIEW' ? 'fraud_alert' : 'transaction',
      title: notifTitle,
      message: mlResult.recommendation,
      metadata: { transactionId, riskScore: mlResult.risk_score, riskLevel: mlResult.risk_level }
    });

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(userId.toString()).emit('transaction_update', {
        transactionId, status: transaction.status, riskLevel: mlResult.risk_level
      });

      if (transaction.status === 'MANAGER_REVIEW') {
        req.app.get('io').to('managers').emit('new_approval_request', {
          transactionId, userId: userId.toString(), amount: transaction.amount, riskScore: mlResult.risk_score
        });
      }
    }

    res.json({
      success: true,
      message: `Transaction ${transaction.status.toLowerCase().replace('_', ' ')}`,
      transaction: {
        transactionId,
        status: transaction.status,
        riskScore: mlResult.risk_score,
        riskLevel: mlResult.risk_level,
        fraudProbability: mlResult.fraud_probability,
        riskFactors: mlResult.risk_factors,
        recommendation: mlResult.recommendation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function executeTransaction(transaction) {
  const fromUser = await User.findById(transaction.fromUser);
  if (fromUser.balance < transaction.amount) {
    transaction.status = 'FAILED';
    return;
  }

  fromUser.balance -= transaction.amount;
  await fromUser.save();

  if (transaction.toUser) {
    await User.findByIdAndUpdate(transaction.toUser, { $inc: { balance: transaction.amount } });
  }

  transaction.status = 'SUCCESS';
  await auditToBlockchain('TRANSACTION_EXECUTED', transaction.fromUser, {
    transactionId: transaction.transactionId,
    amount: transaction.amount,
    type: transaction.type
  });
}

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const userId = req.user._id;

    const query = { $or: [{ fromUser: userId }, { toUser: userId }] };
    if (status) query.status = status;
    if (type) query.type = type;

    const transactions = await Transaction.find(query)
      .populate('fromUser', 'firstName lastName accountNumber')
      .populate('toUser', 'firstName lastName accountNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.id,
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }]
    }).populate('fromUser toUser', 'firstName lastName accountNumber email');

    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.managerApprove = async (req, res) => {
  try {
    const { transactionId, approved, note } = req.body;

    const transaction = await Transaction.findOne({ transactionId });
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    if (transaction.status !== 'MANAGER_REVIEW') {
      return res.status(400).json({ success: false, message: 'Transaction is not pending manager review' });
    }

    transaction.managerApprovedBy = req.user._id;
    transaction.managerApprovedAt = new Date();
    transaction.managerNote = note;

    if (approved) {
      await executeTransaction(transaction);
    } else {
      transaction.status = 'FAILED';
    }

    await transaction.save();
    await auditToBlockchain('MANAGER_DECISION', req.user._id, { transactionId, approved, note });

    await Notification.create({
      userId: transaction.fromUser,
      type: 'approval',
      title: approved ? 'Transaction Approved' : 'Transaction Rejected',
      message: note || (approved ? 'Your transaction was approved by a manager.' : 'Your transaction was rejected.'),
      metadata: { transactionId }
    });

    if (req.app.get('io')) {
      req.app.get('io').to(transaction.fromUser.toString()).emit('transaction_update', {
        transactionId, status: transaction.status, managerDecision: approved
      });
    }

    res.json({ success: true, message: `Transaction ${approved ? 'approved' : 'rejected'}`, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'MANAGER_REVIEW' })
      .populate('fromUser', 'firstName lastName email accountNumber riskScore')
      .populate('toUser', 'firstName lastName accountNumber')
      .sort({ createdAt: -1 });

    res.json({ success: true, transactions, total: transactions.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
