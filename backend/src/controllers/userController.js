const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { Notification } = require('../models');

// Get profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (error) {
    next(error);
  }
};

// Get balance
exports.getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('balance accountNumber');
    res.json({ success: true, balance: user.balance, accountNumber: user.accountNumber });
  } catch (error) {
    next(error);
  }
};

// Get dashboard data
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [user, recentTransactions, totalSent, totalReceived] = await Promise.all([
      User.findById(userId).select('-password'),
      Transaction.find({ sender: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('receiver', 'firstName lastName accountNumber'),
      Transaction.aggregate([
        { $match: { sender: userId, status: 'COMPLETED', type: { $in: ['TRANSFER', 'PAYMENT', 'WITHDRAWAL'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { receiver: userId, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const unreadNotifications = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      dashboard: {
        balance: user.balance,
        accountNumber: user.accountNumber,
        riskScore: user.riskScore,
        riskLevel: user.riskLevel,
        recentTransactions,
        totalSent: totalSent[0]?.total || 0,
        totalReceived: totalReceived[0]?.total || 0,
        unreadNotifications
      }
    });
  } catch (error) {
    next(error);
  }
};

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
