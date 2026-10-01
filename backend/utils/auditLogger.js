const AuditLog = require('../models/AuditLog');

const createAuditLog = async ({
  adminUser,
  action,
  targetType,
  targetId = null,
  details = '',
  oldValue = '',
  newValue = '',
  req = null,
}) => {
  try {
    if (!adminUser) return;

    const ipAddress = req
      ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'
      : '127.0.0.1';

    await AuditLog.create({
      admin: adminUser._id,
      adminName: adminUser.name || 'Admin',
      adminRole: adminUser.role || 'ADMIN',
      action,
      targetType,
      targetId,
      details,
      oldValue,
      newValue,
      ipAddress,
    });
  } catch (error) {
    console.error('Audit Log Recording Error:', error.message);
  }
};

module.exports = { createAuditLog };
