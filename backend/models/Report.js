const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['POST', 'COMMENT', 'BLOG', 'USER'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'REMOVED', 'DISMISSED', 'SUSPENDED', 'WARNED', 'BANNED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Report', reportSchema);
