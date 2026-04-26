const User = require('../models/User');
const { LoginAttempt } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  findRefreshToken
} = require('../utils/jwt');
const { createOTP, verifyOTP } = require('../services/otpService');
const { notifyLoginAlert } = require('../services/notificationService');
const { emitLoginAlert } = require('../services/socketService');
const logger = require('../utils/logger');

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 minutes

const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || 'Unknown';
  if (ua.includes('Mobile')) return 'Mobile';
  if (ua.includes('Tablet')) return 'Tablet';
  return 'Desktop';
};

const getIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'Unknown';
};

// Register
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ firstName, lastName, email, password, phone });

    // Send verification OTP
    const otp = await createOTP(user._id, 'VERIFICATION');
    logger.info(`Verification OTP for ${email}: ${otp}`); // In production, send via email

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email.',
      userId: user._id
    });
  } catch (error) {
    next(error);
  }
};

// Verify email
exports.verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const result = await verifyOTP(userId, otp, 'VERIFICATION');
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    await User.findByIdAndUpdate(userId, { isVerified: true });

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (error) {
    next(error);
  }
};

// Login - Step 1: Password check
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getIP(req);
    const deviceInfo = getDeviceInfo(req);

    const user = await User.findOne({ email });

    // Log attempt
    await LoginAttempt.create({
      userId: user?._id,
      email,
      success: false,
      ipAddress,
      deviceInfo,
      userAgent: req.headers['user-agent']
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check if locked
    if (user.isAccountLocked()) {
      const remainingMs = user.lockUntil - Date.now();
      const remainingSecs = Math.ceil(remainingMs / 1000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${remainingSecs} seconds.`,
        lockUntil: user.lockUntil
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await user.save();

        await notifyLoginAlert(user._id, ipAddress, deviceInfo, false);
        emitLoginAlert(user._id.toString(), { ipAddress, deviceInfo, locked: true });

        return res.status(423).json({
          success: false,
          message: `Account locked for 2 minutes due to ${MAX_FAILED_ATTEMPTS} failed attempts.`,
          lockUntil: user.lockUntil
        });
      }

      await user.save();
      const remaining = MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${remaining} attempt(s) remaining.`
      });
    }

    // Password correct — send OTP for 2FA
    user.failedLoginAttempts = 0;
    user.isLocked = false;
    await user.save();

    const otp = await createOTP(user._id, 'LOGIN');
    logger.info(`Login OTP for ${email}: ${otp}`); // In production, send via email/SMS

    // Update login attempt to success
    await LoginAttempt.findOneAndUpdate(
      { userId: user._id, success: false },
      { success: true },
      { sort: { createdAt: -1 } }
    );

    res.json({
      success: true,
      message: 'OTP sent to your registered email/phone.',
      userId: user._id,
      requireOtp: true
    });
  } catch (error) {
    next(error);
  }
};

// Login - Step 2: OTP verification
exports.verifyLoginOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;
    const ipAddress = getIP(req);
    const deviceInfo = getDeviceInfo(req);

    const result = await verifyOTP(userId, otp, 'LOGIN');
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user._id, refreshToken, ipAddress, deviceInfo);

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIp = ipAddress;
    user.lastLoginDevice = deviceInfo;
    await user.save();

    await notifyLoginAlert(user._id, ipAddress, deviceInfo, true);
    emitLoginAlert(user._id.toString(), { ipAddress, deviceInfo, success: true });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        accountNumber: user.accountNumber,
        balance: user.balance,
        riskScore: user.riskScore,
        riskLevel: user.riskLevel
      }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    const tokenRecord = await findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    // Rotate tokens
    await revokeRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
    const newRefreshToken = generateRefreshToken();
    await saveRefreshToken(user._id, newRefreshToken, req.ip, getDeviceInfo(req));

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
