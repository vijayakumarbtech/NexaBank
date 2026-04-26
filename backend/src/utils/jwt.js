const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { RefreshToken } = require('../models');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m'
  });
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const saveRefreshToken = async (userId, token, ipAddress, deviceInfo) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await RefreshToken.create({
    userId,
    token,
    expiresAt,
    ipAddress,
    deviceInfo
  });
};

const revokeRefreshToken = async (token) => {
  await RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });
};

const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
};

const findRefreshToken = async (token) => {
  return RefreshToken.findOne({ token, isRevoked: false });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  findRefreshToken
};
