const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { FraudLog, LoginAttempt, ActivityLog, Payment, Notification } = require('../models');
const { validateChain } = require('../services/blockchainService');
const logger = require('../utils/logger');

// Dashboard stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      pendingTransactions,
      totalFraudLogs,
      highRiskLogs,
      blockedLogs,
      totalRevenue,
      recentAlerts
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'PENDING', requiresApproval: true }),
      FraudLog.countDocuments(),
      FraudLog.countDocuments({ riskLevel: 'HIGH_RISK' }),
      FraudLog.countDocuments({ riskLevel: 'BLOCKED' }),
      Transaction.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      FraudLog.find({ riskLevel: { $in: ['HIGH_RISK', 'BLOCKED'] } })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    // Transaction trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const transactionTrend = await Transaction.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fraud by risk level
    const fraudByLevel = await FraudLog.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
        transactions: {
          total: totalTransactions,
          pending: pendingTransactions,
          revenue: totalRevenue[0]?.total || 0
        },
        fraud: {
          total: totalFraudLogs,
          highRisk: highRiskLogs,
          blocked: blockedLogs
        }
      },
      transactionTrend,
      fraudByLevel,
      recentAlerts
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, riskLevel, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (riskLevel) query.riskLevel = riskLevel;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// Update user (admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { isActive, role, riskLevel, balance } = req.body;
    const updateData = {};

    if (isActive !== undefined) updateData.isActive = isActive;
    if (role && ['user', 'manager', 'admin'].includes(role)) updateData.role = role;
    if (riskLevel) updateData.riskLevel = riskLevel;
    if (balance !== undefined) updateData.balance = balance;

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User updated.', user });
  } catch (error) {
    next(error);
  }
};

// Get fraud logs
exports.getFraudLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, riskLevel } = req.query;
    const query = {};
    if (riskLevel) query.riskLevel = riskLevel;

    const logs = await FraudLog.find(query)
      .populate('userId', 'firstName lastName email accountNumber')
      .populate('resolvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await FraudLog.countDocuments(query);

    res.json({ success: true, logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// Validate blockchain
exports.validateBlockchain = async (req, res, next) => {
  try {
    const result = await validateChain();
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Get login attempts
exports.getLoginAttempts = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, success } = req.query;
    const query = {};
    if (success !== undefined) query.success = success === 'true';

    const attempts = await LoginAttempt.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await LoginAttempt.countDocuments(query);

    res.json({ success: true, attempts, pagination: { total } });
  } catch (error) {
    next(error);
  }
};

// Get activity logs
exports.getActivityLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const logs = await ActivityLog.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments();

    res.json({ success: true, logs, pagination: { total } });
  } catch (error) {
    next(error);
  }
};

// Resolve fraud log
exports.resolveFraudLog = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    const log = await FraudLog.findByIdAndUpdate(
      req.params.logId,
      { resolvedBy: req.user._id, resolvedAt: new Date(), resolution },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, message: 'Fraud log not found.' });
    }

    res.json({ success: true, message: 'Fraud log resolved.', log });
  } catch (error) {
    next(error);
  }
};
