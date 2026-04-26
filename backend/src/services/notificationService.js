const { Notification } = require('../models');
const { emitToUser, emitToAdmins } = require('./socketService');
const logger = require('../utils/logger');

const createNotification = async (userId, type, title, message, data = {}, priority = 'MEDIUM') => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      priority
    });

    // Emit real-time notification
    emitToUser(userId.toString(), 'notification:new', {
      _id: notification._id,
      type,
      title,
      message,
      priority,
      createdAt: notification.createdAt
    });

    // Emit to admins for critical alerts
    if (priority === 'HIGH' || priority === 'CRITICAL') {
      emitToAdmins('notification:critical', {
        userId,
        type,
        title,
        message,
        priority
      });
    }

    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
  }
};

const notifyFraudAlert = async (userId, transactionId, riskLevel, amount) => {
  const priority = riskLevel === 'BLOCKED' ? 'CRITICAL' : riskLevel === 'HIGH_RISK' ? 'HIGH' : 'MEDIUM';
  return createNotification(
    userId,
    'FRAUD_ALERT',
    `🚨 Fraud Alert: ${riskLevel}`,
    `Suspicious activity detected on transaction of $${amount}. Risk level: ${riskLevel}`,
    { transactionId, riskLevel, amount },
    priority
  );
};

const notifyLoginAlert = async (userId, ipAddress, deviceInfo, success) => {
  return createNotification(
    userId,
    'LOGIN_ALERT',
    success ? '✅ New Login Detected' : '⚠️ Failed Login Attempt',
    `Login ${success ? 'successful' : 'failed'} from IP: ${ipAddress}, Device: ${deviceInfo}`,
    { ipAddress, deviceInfo, success },
    success ? 'LOW' : 'MEDIUM'
  );
};

const notifyPaymentUpdate = async (userId, paymentId, status, amount) => {
  return createNotification(
    userId,
    'PAYMENT_UPDATE',
    `Payment ${status}`,
    `Your payment of $${amount} is ${status.toLowerCase()}`,
    { paymentId, status, amount },
    status === 'FAILED' ? 'HIGH' : 'MEDIUM'
  );
};

const notifyTransactionUpdate = async (userId, transactionId, status, amount) => {
  return createNotification(
    userId,
    'PAYMENT_UPDATE',
    `Transaction ${status}`,
    `Your transaction of $${amount} has been ${status.toLowerCase()}`,
    { transactionId, status, amount },
    status === 'FAILED' ? 'HIGH' : 'LOW'
  );
};

module.exports = {
  createNotification,
  notifyFraudAlert,
  notifyLoginAlert,
  notifyPaymentUpdate,
  notifyTransactionUpdate
};
