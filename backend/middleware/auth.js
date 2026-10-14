const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hasPermission } = require('../utils/permissions');

// The fallback secret is public in the repo — anyone could forge admin tokens with it,
// so a deployed (Vercel) build refuses to start without a real JWT_SECRET.
if (process.env.VERCEL && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in the Vercel environment variables');
}
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

// For public routes whose response depends on who is asking (e.g. staff see
// unmoderated content). Never rejects: a missing/invalid token or a banned or
// suspended account is simply treated as anonymous.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isBanned && !user.isSuspended) req.user = user;
    } catch {
      /* anonymous */
    }
  }
  next();
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

// Staff-only route guard for one named permission (see utils/permissions.js).
// SUPER_ADMIN always passes; ADMIN/MODERATOR need the permission; members never pass.
const checkPermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (hasPermission(req.user, permissionName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have access to this area. Ask the Super Admin to grant it.',
      requiredPermission: permissionName,
    });
  };
};

module.exports = { protect, optionalAuth, adminOnly, superAdminOnly, checkPermission, requirePermission: checkPermission, JWT_SECRET };
