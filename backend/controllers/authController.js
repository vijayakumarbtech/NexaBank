const User = require('../models/User');
const LoginAttempt = require('../models/LoginAttempt');
const Notification = require('../models/Notification');
const { createOtp, verifyOtp } = require('../services/otpService');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } = require('../services/tokenService');
const { auditToBlockchain } = require('../services/fraudService');

const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
const LOCK_MINUTES = parseInt(process.env.ACCOUNT_LOCK_MINUTES) || 2;

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ firstName, lastName, email, password, phone });

    await auditToBlockchain('USER_REGISTERED', user._id, { email, firstName, lastName });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const deviceInfo = req.headers['user-agent'];

    const user = await User.findOne({ email });

    if (!user) {
      await LoginAttempt.create({ email, ipAddress, deviceInfo, success: false, failureReason: 'User not found' });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check lock
    if (user.isAccountLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ success: false, message: `Account locked. Try again in ${remaining} minute(s)` });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      user.failedLoginAttempts += 1;
      await LoginAttempt.create({ userId: user._id, email, ipAddress, deviceInfo, success: false, failureReason: 'Wrong password' });

      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await user.save();

        // Notify user
        await Notification.create({
          userId: user._id,
          type: 'login_alert',
          title: 'Account Locked',
          message: `Your account was locked after ${MAX_ATTEMPTS} failed login attempts. It will unlock in ${LOCK_MINUTES} minutes.`,
          metadata: { ipAddress, deviceInfo }
        });

        return res.status(423).json({ success: false, message: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.` });
      }

      await user.save();
      const remaining = MAX_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({ success: false, message: `Invalid credentials. ${remaining} attempt(s) remaining.` });
    }

    // Successful password check - send OTP for 2FA
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();

    const { otp } = await createOtp(user._id, 'login');

    res.json({
      success: true,
      message: 'Password verified. OTP sent for 2FA.',
      userId: user._id,
      requiresOtp: true,
      otp // In production: remove this, send via SMS/email
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyLoginOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const ipAddress = req.ip;
    const deviceInfo = req.headers['user-agent'];

    const result = await verifyOtp(userId, otp, 'login');
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    user.lastLoginDevice = deviceInfo;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id, ipAddress, deviceInfo);

    await LoginAttempt.create({ userId: user._id, email: user.email, ipAddress, deviceInfo, success: true });
    await auditToBlockchain('USER_LOGIN', user._id, { ipAddress, deviceInfo });

    await Notification.create({
      userId: user._id,
      type: 'login_alert',
      title: 'New Login',
      message: `Login from ${ipAddress} on ${new Date().toLocaleString()}`,
      metadata: { ipAddress, deviceInfo }
    });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: user.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const record = await verifyRefreshToken(refreshToken);
    if (!record) return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });

    const user = await User.findById(record.userId);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'User not found or inactive' });

    const accessToken = generateAccessToken(user._id, user.role);

    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    await auditToBlockchain('USER_LOGOUT', req.user._id, { timestamp: new Date() });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
