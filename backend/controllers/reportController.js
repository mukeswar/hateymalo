const Report = require('../models/Report');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Submit report for Post, Comment, Blog, or User
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ success: false, message: 'Target type, target ID, and reason are required' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      status: 'PENDING',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully to community moderators',
      data: report,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all pending reports (Admin only)
// @route   GET /api/reports
// @access  Private/Admin
const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find({ status: 'PENDING' })
      .populate('reporter', 'name email')
      .sort({ createdAt: -1 });

    // Populate target entities dynamically
    const populatedReports = await Promise.all(
      reports.map(async (r) => {
        let targetDoc = null;
        if (r.targetType === 'POST') targetDoc = await Post.findById(r.targetId).select('title description creator');
        if (r.targetType === 'COMMENT') targetDoc = await Comment.findById(r.targetId).select('content author');
        if (r.targetType === 'BLOG') targetDoc = await Blog.findById(r.targetId).select('title content author');
        if (r.targetType === 'USER') targetDoc = await User.findById(r.targetId).select('name email memberLevel isSuspended');

        return {
          ...r.toObject(),
          targetDoc,
        };
      })
    );

    res.json({
      success: true,
      count: populatedReports.length,
      data: populatedReports,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resolve Report Action (Admin only: DISMISS, REMOVE, WARN, SUSPEND)
// @route   PUT /api/reports/:id/resolve
// @access  Private/Admin
const resolveReportAction = async (req, res) => {
  try {
    const { action, reasonNote } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Resolve which user owns the reported content (for user-directed actions).
    const resolveTargetUserId = async () => {
      if (report.targetType === 'USER') return report.targetId;
      if (report.targetType === 'POST') {
        const p = await Post.findById(report.targetId);
        return p ? p.creator : null;
      }
      if (report.targetType === 'BLOG') {
        const b = await Blog.findById(report.targetId);
        return b ? b.author : null;
      }
      if (report.targetType === 'COMMENT') {
        const c = await Comment.findById(report.targetId);
        return c ? c.author : null;
      }
      return null;
    };

    const notifyUser = async (recipientId, title, message) => {
      if (!recipientId) return;
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'WARNING',
        title,
        message,
      });
    };

    if (action === 'DISMISS') {
      report.status = 'DISMISSED';
    } else if (action === 'REMOVE_CONTENT') {
      report.status = 'REMOVED';
      const ownerId = await resolveTargetUserId();
      if (report.targetType === 'POST') {
        await Post.findByIdAndDelete(report.targetId);
        await Comment.deleteMany({ post: report.targetId });
      }
      if (report.targetType === 'COMMENT') await Comment.findByIdAndDelete(report.targetId);
      if (report.targetType === 'BLOG') await Blog.findByIdAndDelete(report.targetId);
      await notifyUser(
        ownerId,
        'Content Removed by Moderators ⚠️',
        `Your ${report.targetType.toLowerCase()} was removed. ${reasonNote || 'It violated community guidelines.'}`
      );
    } else if (action === 'WARN_USER') {
      report.status = 'WARNED';
      const userId = await resolveTargetUserId();
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.warnings.push({ reason: reasonNote || 'Community guidelines violation.' });
          await user.save();
        }
      }
      await notifyUser(
        userId,
        'Official Warning ⚠️',
        `You have received a moderation warning. ${reasonNote || 'Please review our community guidelines.'}`
      );
    } else if (action === 'SUSPEND_USER') {
      report.status = 'SUSPENDED';
      const userId = await resolveTargetUserId();
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.role !== 'SUPER_ADMIN') {
          user.isSuspended = true;
          user.suspensionReason = reasonNote || 'Repeated safety & moderation guidelines violations.';
          await user.save();
        }
      }
      await notifyUser(
        userId,
        'Account Suspended 🚫',
        `Your account has been suspended. ${reasonNote || 'Repeated guideline violations.'}`
      );
    } else if (action === 'BAN_USER') {
      report.status = 'BANNED';
      const userId = await resolveTargetUserId();
      if (userId) {
        const user = await User.findById(userId);
        if (user && user.role !== 'SUPER_ADMIN') {
          user.isBanned = true;
          user.banReason = reasonNote || 'Permanent ban for severe policy violations.';
          user.isSuspended = true;
          user.suspensionReason = user.banReason;
          await user.save();
        }
      }
    } else {
      return res.status(400).json({ success: false, message: `Unknown report action: ${action}` });
    }

    await report.save();

    res.json({
      success: true,
      message: `Report resolved with action: ${action}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReport,
  getAllReports,
  resolveReportAction,
};
