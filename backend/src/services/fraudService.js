const axios = require('axios');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { FraudLog } = require('../models');
const logger = require('../utils/logger');

// Fraud scoring weights (stored in config)
const FRAUD_WEIGHTS = {
  highAmount: 25,
  highFrequency: 20,
  failedLogins: 15,
  locationMismatch: 15,
  oddHours: 10,
  newAccount: 10,
  largeAmountNewAccount: 20,
  multipleCountries: 15,
  roundAmount: 5
};

const THRESHOLDS = {
  highAmount: 5000,
  highFrequency: 5, // transactions per hour
  failedLoginThreshold: 2,
  newAccountDays: 30,
  oddHoursStart: 0,  // midnight
  oddHoursEnd: 5    // 5 AM
};

const RISK_LEVELS = {
  SAFE: { min: 0, max: 30 },
  SUSPICIOUS: { min: 31, max: 60 },
  HIGH_RISK: { min: 61, max: 80 },
  BLOCKED: { min: 81, max: 100 }
};

const getRiskLevel = (score) => {
  if (score <= 30) return 'SAFE';
  if (score <= 60) return 'SUSPICIOUS';
  if (score <= 80) return 'HIGH_RISK';
  return 'BLOCKED';
};

const analyzeTransaction = async (transaction, user, requestMeta = {}) => {
  try {
    // Try ML service first
    if (process.env.ML_API_URL) {
      try {
        const recentTxCount = await Transaction.countDocuments({
          sender: user._id,
          createdAt: { $gte: new Date(Date.now() - 3600000) }
        });

        const accountAgeDays = Math.floor(
          (Date.now() - new Date(user.accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const mlPayload = {
          user_id: user._id.toString(),
          amount: transaction.amount,
          transaction_frequency: recentTxCount,
          failed_logins: user.failedLoginAttempts || 0,
          location_mismatch: requestMeta.locationMismatch ? 1 : 0,
          transaction_hour: new Date().getHours(),
          account_age_days: accountAgeDays,
          transaction_type: transaction.type
        };

        const mlResponse = await axios.post(`${process.env.ML_API_URL}/predict`, mlPayload, {
          timeout: 5000
        });

        if (mlResponse.data && mlResponse.data.risk_score !== undefined) {
          const mlResult = mlResponse.data;
          return {
            riskScore: mlResult.risk_score,
            riskLevel: mlResult.risk_level || getRiskLevel(mlResult.risk_score),
            fraudProbability: mlResult.fraud_probability || mlResult.risk_score / 100,
            flags: mlResult.flags || [],
            source: 'ml_service',
            features: mlPayload
          };
        }
      } catch (mlError) {
        logger.warn('ML service unavailable, using rule-based scoring:', mlError.message);
      }
    }

    // Rule-based fallback scoring
    return await ruleBasedScoring(transaction, user, requestMeta);
  } catch (error) {
    logger.error('Fraud analysis error:', error);
    return { riskScore: 0, riskLevel: 'SAFE', fraudProbability: 0, flags: [], source: 'error_fallback' };
  }
};

const ruleBasedScoring = async (transaction, user, requestMeta = {}) => {
  let riskScore = 0;
  const flags = [];
  const featureScores = {};

  // Feature 1: High amount
  if (transaction.amount >= THRESHOLDS.highAmount) {
    const score = Math.min(FRAUD_WEIGHTS.highAmount, Math.floor(transaction.amount / THRESHOLDS.highAmount) * 10);
    riskScore += score;
    featureScores.highAmount = score;
    flags.push(`HIGH_AMOUNT: $${transaction.amount}`);
  }

  // Feature 2: Transaction frequency (last hour)
  const recentTxCount = await Transaction.countDocuments({
    sender: user._id,
    createdAt: { $gte: new Date(Date.now() - 3600000) },
    status: { $in: ['COMPLETED', 'PENDING', 'APPROVED'] }
  });

  if (recentTxCount >= THRESHOLDS.highFrequency) {
    riskScore += FRAUD_WEIGHTS.highFrequency;
    featureScores.highFrequency = FRAUD_WEIGHTS.highFrequency;
    flags.push(`HIGH_FREQUENCY: ${recentTxCount} txns/hr`);
  }

  // Feature 3: Failed login attempts
  if (user.failedLoginAttempts >= THRESHOLDS.failedLoginThreshold) {
    riskScore += FRAUD_WEIGHTS.failedLogins;
    featureScores.failedLogins = FRAUD_WEIGHTS.failedLogins;
    flags.push(`FAILED_LOGINS: ${user.failedLoginAttempts}`);
  }

  // Feature 4: Location mismatch
  if (requestMeta.locationMismatch) {
    riskScore += FRAUD_WEIGHTS.locationMismatch;
    featureScores.locationMismatch = FRAUD_WEIGHTS.locationMismatch;
    flags.push('LOCATION_MISMATCH');
  }

  // Feature 5: Odd hours (midnight - 5 AM)
  const currentHour = new Date().getHours();
  if (currentHour >= THRESHOLDS.oddHoursStart && currentHour < THRESHOLDS.oddHoursEnd) {
    riskScore += FRAUD_WEIGHTS.oddHours;
    featureScores.oddHours = FRAUD_WEIGHTS.oddHours;
    flags.push(`ODD_HOURS: ${currentHour}:00`);
  }

  // Feature 6: New account
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (accountAgeDays < THRESHOLDS.newAccountDays) {
    riskScore += FRAUD_WEIGHTS.newAccount;
    featureScores.newAccount = FRAUD_WEIGHTS.newAccount;
    flags.push(`NEW_ACCOUNT: ${accountAgeDays} days old`);

    if (transaction.amount >= THRESHOLDS.highAmount) {
      riskScore += FRAUD_WEIGHTS.largeAmountNewAccount;
      featureScores.largeAmountNewAccount = FRAUD_WEIGHTS.largeAmountNewAccount;
      flags.push('LARGE_AMOUNT_NEW_ACCOUNT');
    }
  }

  // Feature 7: Round amount (often used in testing/fraud)
  if (transaction.amount % 1000 === 0 && transaction.amount >= 1000) {
    riskScore += FRAUD_WEIGHTS.roundAmount;
    featureScores.roundAmount = FRAUD_WEIGHTS.roundAmount;
    flags.push(`ROUND_AMOUNT: $${transaction.amount}`);
  }

  // Normalize score to 0-100
  const maxPossibleScore = Object.values(FRAUD_WEIGHTS).reduce((a, b) => a + b, 0);
  const normalizedScore = Math.min(100, Math.round((riskScore / maxPossibleScore) * 100));

  return {
    riskScore: normalizedScore,
    riskLevel: getRiskLevel(normalizedScore),
    fraudProbability: normalizedScore / 100,
    flags,
    source: 'rule_based',
    features: {
      amount: transaction.amount,
      transactionFrequency: recentTxCount,
      failedLogins: user.failedLoginAttempts,
      accountAgeDays,
      transactionHour: currentHour,
      rawScore: riskScore,
      featureScores
    }
  };
};

const logFraudAnalysis = async (transactionId, userId, analysisResult) => {
  try {
    await FraudLog.create({
      transactionId,
      userId,
      riskScore: analysisResult.riskScore,
      riskLevel: analysisResult.riskLevel,
      features: analysisResult.features,
      weights: FRAUD_WEIGHTS,
      flags: analysisResult.flags,
      action: analysisResult.riskLevel === 'BLOCKED' ? 'BLOCKED' :
              analysisResult.riskLevel === 'HIGH_RISK' ? 'MANUAL_REVIEW' :
              analysisResult.riskLevel === 'SUSPICIOUS' ? 'FLAGGED' : 'ALLOWED'
    });
  } catch (error) {
    logger.error('Error logging fraud analysis:', error);
  }
};

const updateUserRiskScore = async (userId, newScore, riskLevel) => {
  await User.findByIdAndUpdate(userId, {
    riskScore: newScore,
    riskLevel
  });
};

module.exports = {
  analyzeTransaction,
  ruleBasedScoring,
  logFraudAnalysis,
  updateUserRiskScore,
  getRiskLevel,
  FRAUD_WEIGHTS,
  THRESHOLDS
};
