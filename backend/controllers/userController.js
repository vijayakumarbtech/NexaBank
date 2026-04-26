const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const FraudLog = require('../models/FraudLog');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Profile updated', user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('balance accountNumber');
    res.json({ success: true, balance: user.balance, accountNumber: user.accountNumber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    const total = await Notification.countDocuments({ userId: req.user._id });

    res.json({ success: true, notifications, total, unreadCount, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserRisk = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('riskScore previousFraudFlags');
    const recentFraud = await FraudLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      riskScore: user.riskScore,
      previousFraudFlags: user.previousFraudFlags,
      recentAnalysis: recentFraud
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
