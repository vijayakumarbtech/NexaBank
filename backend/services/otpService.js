const bcrypt = require('bcryptjs');
const OtpCode = require('../models/OtpCode');

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOtp = async (userId, purpose, transactionId = null) => {
  // Invalidate previous OTPs for this user/purpose
  await OtpCode.updateMany(
    { userId, purpose, isUsed: false },
    { isUsed: true }
  );

  const otp = generateOtp();
  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(otp, salt);

  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 2;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await OtpCode.create({
    userId,
    hashedOtp,
    purpose,
    expiresAt,
    transactionId
  });

  // In production, send via SMS/email. Here we log it (console acts as simulator).
  console.log(`[OTP SERVICE] Generated OTP for user ${userId}: ${otp} (expires in ${expiryMinutes} min)`);
  
  return { otp, expiresAt }; // In production, don't return plain OTP
};

const verifyOtp = async (userId, plainOtp, purpose, transactionId = null) => {
  const query = { userId, purpose, isUsed: false };
  if (transactionId) query.transactionId = transactionId;

  const otpRecord = await OtpCode.findOne(query).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { valid: false, reason: 'OTP not found or already used' };
  }

  if (otpRecord.isExpired()) {
    return { valid: false, reason: 'OTP has expired' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    return { valid: false, reason: 'Maximum OTP attempts exceeded' };
  }

  const isMatch = await otpRecord.verifyOtp(plainOtp);
  
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = otpRecord.maxAttempts - otpRecord.attempts;
    return { valid: false, reason: `Invalid OTP. ${remaining} attempt(s) remaining` };
  }

  otpRecord.isUsed = true;
  await otpRecord.save();

  return { valid: true };
};

module.exports = { createOtp, verifyOtp, generateOtp };
