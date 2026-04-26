const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hashedOtp: { type: String, required: true },
  purpose: { type: String, enum: ['login', 'transaction', 'password_reset'], required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  isUsed: { type: Boolean, default: false },
  transactionId: { type: String },
}, { timestamps: true });

otpSchema.methods.verifyOtp = async function(plainOtp) {
  return bcrypt.compare(plainOtp, this.hashedOtp);
};

otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('OtpCode', otpSchema);
