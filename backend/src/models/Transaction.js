const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiverAccountNumber: { type: String },
  type: {
    type: String,
    enum: ['TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT'],
    required: true
  },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'USD' },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['INITIATED', 'OTP_PENDING', 'PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'FLAGGED'],
    default: 'INITIATED'
  },
  fraudScore: { type: Number, default: 0 },
  fraudLevel: { type: String, enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'BLOCKED'], default: 'SAFE' },
  fraudDetails: { type: mongoose.Schema.Types.Mixed },
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  ipAddress: { type: String },
  deviceInfo: { type: String },
  location: { type: String },
  blockchainHash: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  completedAt: { type: Date }
}, { timestamps: true });

transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ fraudLevel: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
