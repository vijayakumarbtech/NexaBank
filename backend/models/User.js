const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  balance: { type: Number, default: 10000.00, min: 0 },
  accountNumber: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  lockUntil: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  riskScore: { type: Number, default: 0 },
  previousFraudFlags: { type: Number, default: 0 },
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
  lastLoginDevice: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', function(next) {
  if (!this.accountNumber) {
    this.accountNumber = 'ACC' + Date.now() + Math.floor(Math.random() * 1000);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isAccountLocked = function() {
  if (!this.isLocked) return false;
  if (this.lockUntil && this.lockUntil < new Date()) {
    return false;
  }
  return true;
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
