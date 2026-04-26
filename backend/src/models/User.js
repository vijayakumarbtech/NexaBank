const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  accountNumber: { type: String, unique: true },
  balance: { type: Number, default: 10000, min: 0 },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isLocked: { type: Boolean, default: false },
  lockUntil: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  riskLevel: { type: String, enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'BLOCKED'], default: 'SAFE' },
  lastLogin: { type: Date },
  lastLoginIp: { type: String },
  lastLoginDevice: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zip: String
  },
  accountCreatedAt: { type: Date, default: Date.now },
  twoFactorEnabled: { type: Boolean, default: true },
  profilePicture: { type: String }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate account number
userSchema.pre('save', async function(next) {
  if (!this.accountNumber) {
    this.accountNumber = 'ACC' + Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.isLocked) return false;
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.isLocked = false;
    this.failedLoginAttempts = 0;
    return false;
  }
  return true;
};

userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
