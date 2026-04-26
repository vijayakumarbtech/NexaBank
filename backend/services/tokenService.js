const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { v4: uuidv4 } = require('uuid');

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

const generateRefreshToken = async (userId, ipAddress, deviceInfo) => {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({ userId, token, expiresAt, ipAddress, deviceInfo });
  return token;
};

const verifyRefreshToken = async (token) => {
  const record = await RefreshToken.findOne({ token, isRevoked: false });
  if (!record) return null;
  if (new Date() > record.expiresAt) {
    record.isRevoked = true;
    await record.save();
    return null;
  }
  return record;
};

const revokeRefreshToken = async (token) => {
  await RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
};

module.exports = { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken, revokeAllUserTokens };
