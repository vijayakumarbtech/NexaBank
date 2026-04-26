const axios = require('axios');
const Transaction = require('../models/Transaction');
const FraudLog = require('../models/FraudLog');
const User = require('../models/User');

const ML_API_URL = process.env.ML_API_URL;

const analyzeTransaction = async (userId, amount, ipAddress, deviceInfo) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const accountAgeDays = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    // Get transaction frequency (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = await Transaction.countDocuments({
      fromUser: userId,
      createdAt: { $gte: oneHourAgo }
    });

    const transactionHour = new Date().getHours();
    const locationMismatch = user.lastLoginIp && ipAddress && user.lastLoginIp !== ipAddress;
    const deviceChange = user.lastLoginDevice && deviceInfo && user.lastLoginDevice !== deviceInfo;
    const largeAmountFlag = amount > (user.balance * 0.5) || amount > 10000;

    const features = {
      user_id: userId.toString(),
      amount,
      transaction_frequency: recentTransactions,
      failed_logins: user.failedLoginAttempts,
      location_mismatch: !!locationMismatch,
      transaction_hour: transactionHour,
      account_age_days: accountAgeDays,
      previous_fraud_flags: user.previousFraudFlags || 0,
      device_change: !!deviceChange,
      large_amount_flag: largeAmountFlag
    };

    const response = await axios.post(`${ML_API_URL}/predict`, features, { timeout: 10000 });
    return response.data;
  } catch (error) {
    console.error('Fraud service error:', error.message);
    // Fallback: basic rule-based check
    return {
      risk_score: amount > 50000 ? 70 : 20,
      fraud_probability: amount > 50000 ? 0.7 : 0.2,
      risk_level: amount > 50000 ? 'HIGH_RISK' : 'SAFE',
      risk_factors: ['ML service unavailable, fallback rules applied'],
      recommendation: 'Manual review recommended due to ML service unavailability'
    };
  }
};

const logFraudAnalysis = async (userId, transactionId, mlResult, action) => {
  try {
    const log = await FraudLog.create({
      userId,
      transactionId,
      riskScore: mlResult.risk_score,
      riskLevel: mlResult.risk_level,
      fraudProbability: mlResult.fraud_probability,
      riskFactors: mlResult.risk_factors || [],
      recommendation: mlResult.recommendation,
      action
    });
    return log;
  } catch (error) {
    console.error('Fraud log error:', error.message);
  }
};

const auditToBlockchain = async (eventType, userId, data) => {
  try {
    await axios.post(`${ML_API_URL}/audit/log`, {
      event_type: eventType,
      user_id: userId.toString(),
      data
    }, { timeout: 10000 });
  } catch (error) {
    console.error('Blockchain audit error:', error.message);
  }
};

module.exports = { analyzeTransaction, logFraudAnalysis, auditToBlockchain };
