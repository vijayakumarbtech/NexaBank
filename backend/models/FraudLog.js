const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  transactionId: { type: String },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, required: true },
  fraudProbability: { type: Number, required: true },
  riskFactors: [{ type: String }],
  recommendation: { type: String },
  action: { type: String, enum: ['ALLOWED', 'FLAGGED', 'BLOCKED', 'MANAGER_REVIEW'] },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolution: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
