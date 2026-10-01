const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'haatemalo_super_secret_jwt_key_2026';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User account not found' });
      }

      if (req.user.isBanned) {
        return res.status(403).json({
          success: false,
          message: `Account Banned: ${req.user.banReason || 'Permanent removal for severe policy violations.'}`,
          banned: true,
        });
      }

      if (req.user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: `Account Suspended: ${req.user.suspensionReason || 'Violation of community safety guidelines.'}`,
          suspended: true,
        });
      }

      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(req.user.role)) {
    return next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin authorization required' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Super Admin authorization required' });
  }
};

const checkPermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Insufficient permission. Required: ${permissionName}`,
    });
  };
};

module.exports = { protect, adminOnly, superAdminOnly, checkPermission, JWT_SECRET };
