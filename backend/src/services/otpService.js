const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OTP } = require('../models');
const logger = require('../utils/logger');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOTP = async (userId, purpose, transactionId = null) => {
  // Invalidate previous OTPs for same purpose
  await OTP.updateMany(
    { userId, purpose, isUsed: false },
    { isUsed: true }
  );

  const otp = generateOTP();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 2); // 2 minutes expiry

  await OTP.create({
    userId,
    otpHash,
    purpose,
    expiresAt,
    transactionId
  });

  logger.info(`OTP created for user ${userId}, purpose: ${purpose}`);
  return otp; // Return plain OTP to send to user
};

const verifyOTP = async (userId, otpCode, purpose) => {
  const otpRecord = await OTP.findOne({
    userId,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { success: false, message: 'OTP expired or not found. Please request a new one.' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    otpRecord.isUsed = true;
    await otpRecord.save();
    return { success: false, message: 'Maximum OTP attempts exceeded. Please request a new one.' };
  }

  otpRecord.attempts += 1;
  await otpRecord.save();

  const isValid = await otpRecord.compareOtp(otpCode);

  if (!isValid) {
    const remaining = otpRecord.maxAttempts - otpRecord.attempts;
    return { 
      success: false, 
      message: `Invalid OTP. ${remaining} attempt(s) remaining.` 
    };
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  return { success: true, message: 'OTP verified successfully' };
};

module.exports = { createOTP, verifyOTP, generateOTP };
