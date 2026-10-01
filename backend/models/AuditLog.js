const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: [true, 'Audit action description is required'],
      trim: true,
    },
    targetType: {
      type: String,
      enum: ['POST', 'USER', 'BLOG', 'EVENT', 'DONATION', 'ORGANIZATION', 'CATEGORY', 'ANNOUNCEMENT', 'SETTINGS', 'REPORT'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    details: {
      type: String,
      default: '',
    },
    oldValue: {
      type: String,
      default: '',
    },
    newValue: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
