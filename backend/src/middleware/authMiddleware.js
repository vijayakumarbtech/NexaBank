const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { ActivityLog } = require('../models');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated.' });
    }

    if (user.isAccountLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.',
        lockUntil: user.lockUntil
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    logger.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    next();
  };
};

const logActivity = (action, resource) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        await ActivityLog.create({
          userId: req.user._id,
          action,
          resource,
          resourceId: req.params?.id,
          details: { method: req.method, path: req.path, query: req.query },
          ipAddress: req.ip || req.headers['x-forwarded-for'],
          userAgent: req.headers['user-agent']
        });
      }
    } catch (err) {
      logger.error('Activity log error:', err);
    }
    next();
  };
};

module.exports = { protect, authorize, logActivity };
