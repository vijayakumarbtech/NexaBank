const User = require('../models/User');
const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const LoginAttempt = require('../models/LoginAttempt');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const axios = require('axios');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalTransactions, fraudLogs, loginAttempts] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      FraudLog.countDocuments(),
      LoginAttempt.countDocuments({ success: false })
    ]);

    const [successTxns, blockedTxns, reviewTxns] = await Promise.all([
      Transaction.countDocuments({ status: 'SUCCESS' }),
      Transaction.countDocuments({ status: 'BLOCKED' }),
      Transaction.countDocuments({ status: 'MANAGER_REVIEW' })
    ]);

    const totalVolume = await Transaction.aggregate([
      { $match: { status: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const recentFraud = await FraudLog.find({ riskLevel: { $in: ['HIGH_RISK', 'BLOCKED'] } })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10);

    const txnByDay = await Transaction.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, volume: { $sum: '$amount' } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTransactions,
        fraudAlerts: fraudLogs,
        failedLogins: loginAttempts,
        successTransactions: successTxns,
        blockedTransactions: blockedTxns,
        pendingReview: reviewTxns,
        totalVolume: totalVolume[0]?.total || 0,
        recentFraud,
        txnByDay: txnByDay.reverse()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const query = {};
    if (search) query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Role updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFraudLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, riskLevel } = req.query;
    const query = riskLevel ? { riskLevel } : {};

    const logs = await FraudLog.find(query)
      .populate('userId', 'firstName lastName email accountNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await FraudLog.countDocuments(query);

    res.json({ success: true, logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBlockchainLogs = async (req, res) => {
  try {
    const response = await axios.get(`${process.env.ML_API_URL}/audit/chain`, { timeout: 10000 });
    res.json({ success: true, ...response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch blockchain logs: ' + error.message });
  }
};

exports.validateBlockchain = async (req, res) => {
  try {
    const response = await axios.get(`${process.env.ML_API_URL}/audit/validate`, { timeout: 10000 });
    res.json({ success: true, ...response.data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to validate blockchain: ' + error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await ActivityLog.find()
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments();
    res.json({ success: true, logs, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLoginAttempts = async (req, res) => {
  try {
    const { page = 1, limit = 50, success } = req.query;
    const query = success !== undefined ? { success: success === 'true' } : {};

    const attempts = await LoginAttempt.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LoginAttempt.countDocuments(query);
    res.json({ success: true, attempts, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
