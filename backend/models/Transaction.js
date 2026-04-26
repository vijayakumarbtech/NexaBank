const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true, min: 0.01 },
  type: { type: String, enum: ['transfer', 'payment', 'withdrawal', 'deposit'], required: true },
  status: { type: String, enum: ['INITIATED', 'OTP_PENDING', 'FRAUD_CHECK', 'MANAGER_REVIEW', 'PENDING', 'SUCCESS', 'FAILED', 'BLOCKED'], default: 'INITIATED' },
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'BLOCKED'], default: 'SAFE' },
  fraudProbability: { type: Number, default: 0 },
  riskFactors: [{ type: String }],
  requiresManagerApproval: { type: Boolean, default: false },
  managerApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerApprovedAt: { type: Date },
  managerNote: { type: String },
  description: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  blockchainBlockIndex: { type: Number },
  blockchainHash: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
