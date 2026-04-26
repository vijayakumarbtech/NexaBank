const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// OTP Model
const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, enum: ['LOGIN', 'TRANSACTION', 'PASSWORD_RESET', 'VERIFICATION'], required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  isUsed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

otpSchema.methods.compareOtp = async function(candidateOtp) {
  return bcrypt.compare(candidateOtp, this.otpHash);
};

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fraud Log Model
const fraudLogSchema = new mongoose.Schema({
  transactionId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'BLOCKED'], required: true },
  features: { type: mongoose.Schema.Types.Mixed },
  weights: { type: mongoose.Schema.Types.Mixed },
  flags: [{ type: String }],
  action: { type: String, enum: ['ALLOWED', 'FLAGGED', 'BLOCKED', 'MANUAL_REVIEW'] },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolution: { type: String }
}, { timestamps: true });

// Login Attempt Model
const loginAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  success: { type: Boolean, required: true },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  userAgent: { type: String },
  reason: { type: String }
}, { timestamps: true });

loginAttemptSchema.index({ createdAt: -1 });
loginAttemptSchema.index({ userId: 1, createdAt: -1 });

// Payment Model
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  cardLast4: { type: String },
  cardBrand: { type: String },
  status: {
    type: String,
    enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
    default: 'INITIATED'
  },
  description: { type: String },
  failureReason: { type: String },
  processedAt: { type: Date }
}, { timestamps: true });

// Blockchain Log Model
const blockchainLogSchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true },
  timestamp: { type: Date, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  previousHash: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  nonce: { type: Number, default: 0 }
}, { timestamps: true });

// Notification Model
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['FRAUD_ALERT', 'LOGIN_ALERT', 'PAYMENT_UPDATE', 'ACCOUNT_UPDATE', 'SYSTEM', 'APPROVAL_REQUEST'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Refresh Token Model
const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  ipAddress: { type: String },
  deviceInfo: { type: String }
}, { timestamps: true });

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Activity Log Model
const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  resource: { type: String },
  resourceId: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, default: true }
}, { timestamps: true });

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

module.exports = {
  OTP: mongoose.model('OTP', otpSchema),
  FraudLog: mongoose.model('FraudLog', fraudLogSchema),
  LoginAttempt: mongoose.model('LoginAttempt', loginAttemptSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  BlockchainLog: mongoose.model('BlockchainLog', blockchainLogSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  RefreshToken: mongoose.model('RefreshToken', refreshTokenSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema)
};
