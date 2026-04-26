const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String, required: true },
  ipAddress: { type: String, required: true },
  deviceInfo: { type: String },
  success: { type: Boolean, required: true },
  failureReason: { type: String },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
