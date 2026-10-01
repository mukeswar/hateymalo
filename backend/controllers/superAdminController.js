const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Blog = require('../models/Blog');
const Donation = require('../models/Donation');
const DonationCampaign = require('../models/DonationCampaign');
const AuditLog = require('../models/AuditLog');
const PlatformSettings = require('../models/PlatformSettings');
const Notification = require('../models/Notification');
const { createAuditLog } = require('../utils/auditLogger');
const { invalidateSettingsCache } = require('../utils/settingsCache');

// @desc    Get Super Admin Recharts Analytics & Statistics
// @route   GET /api/super-admin/analytics
// @access  Private/Admin
const getRechartsAnalytics = async (req, res) => {
  try {
    const { timeRange = '30_DAYS' } = req.query;

    let dateFilter = new Date();
    if (timeRange === 'TODAY') dateFilter.setHours(0, 0, 0, 0);
    else if (timeRange === '7_DAYS') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (timeRange === '30_DAYS') dateFilter.setDate(dateFilter.getDate() - 30);
    else if (timeRange === 'YEAR') dateFilter.setFullYear(dateFilter.getFullYear() - 1);
    else dateFilter = new Date(0); // All time

    const totalUsers = await User.countDocuments();
    const newMembersThisPeriod = await User.countDocuments({ createdAt: { $gte: dateFilter } });
    const pendingPosts = await Post.countDocuments({ status: 'PENDING' });
    const approvedPosts = await Post.countDocuments({ status: 'APPROVED' });
    const activeActivities = await Post.countDocuments({ status: 'APPROVED' });
    const upcomingEvents = await Event.countDocuments({ status: 'UPCOMING' });
    const publishedBlogs = await Blog.countDocuments({ status: 'APPROVED' });

    const allDonations = await Donation.find().select('amount createdAt');
    const totalDonationsAmount = allDonations.reduce((sum, d) => sum + d.amount, 0);

    // Monthly User Growth Aggregation for Recharts
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: dateFilter } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          users: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Posts by Category Bar Chart data
    const postsByCategory = await Post.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Post Status Breakdown Pie/Bar data
    const statusBreakdown = await Post.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          newMembersThisPeriod,
          pendingPosts,
          approvedPosts,
          activeActivities,
          upcomingEvents,
          publishedBlogs,
          totalDonationsAmount,
        },
        charts: {
          userGrowth: userGrowth.map((u) => ({ date: u._id, count: u.users })),
          postsByCategory: postsByCategory.map((c) => ({ category: c._id, count: c.count })),
          statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Approval Center Items (Multi-Tab Moderation)
// @route   GET /api/super-admin/approval-center
// @access  Private/Admin
const getApprovalCenterItems = async (req, res) => {
  try {
    const { contentType = 'POSTS' } = req.query;

    let items = [];
    if (contentType === 'POSTS') {
      items = await Post.find({ status: 'PENDING' })
        .populate('creator', 'name email profilePicture memberLevel')
        .sort({ createdAt: -1 });
    } else if (contentType === 'BLOGS') {
      items = await Blog.find({ status: 'PENDING' })
        .populate('author', 'name email profilePicture')
        .sort({ createdAt: -1 });
    } else if (contentType === 'ORGANIZATIONS') {
      items = await User.find({ memberLevel: 'ORGANIZATION', isVerified: false })
        .select('-password')
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk Post Actions (Bulk Approve, Bulk Reject, Bulk Archive, Bulk Delete)
// @route   POST /api/super-admin/posts/bulk
// @access  Private/Admin
const handleBulkPostAction = async (req, res) => {
  try {
    const { postIds, action, rejectionReason } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one post' });
    }

    if (action === 'APPROVE') {
      await Post.updateMany({ _id: { $in: postIds } }, { status: 'APPROVED' });
      await createAuditLog({
        adminUser: req.user,
        action: `Bulk Approved ${postIds.length} posts`,
        targetType: 'POST',
        details: `Approved post IDs: ${postIds.join(', ')}`,
        req,
      });
    } else if (action === 'REJECT') {
      await Post.updateMany(
        { _id: { $in: postIds } },
        { status: 'REJECTED', rejectionReason: rejectionReason || 'Bulk rejection by admin' }
      );
      await createAuditLog({
        adminUser: req.user,
        action: `Bulk Rejected ${postIds.length} posts`,
        targetType: 'POST',
        details: `Rejected post IDs: ${postIds.join(', ')}`,
        req,
      });
    } else if (action === 'ARCHIVE') {
      await Post.updateMany({ _id: { $in: postIds } }, { status: 'ARCHIVED' });
    } else if (action === 'DELETE') {
      await Post.deleteMany({ _id: { $in: postIds } });
      await createAuditLog({
        adminUser: req.user,
        action: `Bulk Deleted ${postIds.length} posts`,
        targetType: 'POST',
        details: `Deleted post IDs: ${postIds.join(', ')}`,
        req,
      });
    }

    res.json({
      success: true,
      message: `Bulk action "${action}" completed on ${postIds.length} items`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get System Audit Logs (Immutable Activity Log Viewer)
// @route   GET /api/super-admin/audit-logs
// @access  Private/SuperAdmin
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('admin', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Staff / Admin Account (Super Admin only)
// @route   POST /api/super-admin/staff
// @access  Private/SuperAdmin
const createStaffAccount = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    if (!['ADMIN', 'MODERATOR'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid staff role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const staffUser = await User.create({
      name,
      email,
      password,
      role,
      permissions: Array.isArray(permissions) ? permissions : [],
      memberLevel: 'ADMIN',
      isVerified: true,
    });

    await createAuditLog({
      adminUser: req.user,
      action: `Created new staff account: ${name} (${role})`,
      targetType: 'USER',
      targetId: staffUser._id,
      details: `Permissions: ${staffUser.permissions.join(', ')}`,
      req,
    });

    res.status(201).json({
      success: true,
      message: `Staff account created for ${name} (${role})`,
      data: {
        _id: staffUser._id,
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role,
        permissions: staffUser.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Staff Permissions (Super Admin only)
// @route   PUT /api/super-admin/staff/:id/permissions
// @access  Private/SuperAdmin
const updateStaffPermissions = async (req, res) => {
  try {
    const { permissions, role } = req.body;
    const staff = await User.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    if (staff.role === 'SUPER_ADMIN' && req.user._id.toString() !== staff._id.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot modify permissions of another Super Admin' });
    }

    if (role && ['ADMIN', 'MODERATOR'].includes(role)) staff.role = role;
    if (Array.isArray(permissions)) staff.permissions = permissions;

    await staff.save();

    await createAuditLog({
      adminUser: req.user,
      action: `Updated permissions for staff: ${staff.name}`,
      targetType: 'USER',
      targetId: staff._id,
      details: `New role: ${staff.role}, permissions: ${staff.permissions.join(', ')}`,
      req,
    });

    res.json({
      success: true,
      message: 'Staff role and permissions updated',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get / Update Platform Settings & Homepage CMS
// @route   GET /api/super-admin/settings & PUT /api/super-admin/settings
// @access  Private/Admin
const getPlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings({});
    }

    const {
      platformName,
      tagline,
      contactEmail,
      paymentQrCode,
      paymentInstructions,
      paymentPhone,
      heroSmallLabel,
      heroHeadline,
      heroDescription,
      heroImage,
      requirePostApproval,
      requireBlogApproval,
      requireOrgVerification,
      allowPublicDonations,
      allowPublicComments,
      allowRegistrations,
      prohibitedWords,
      maxPostsPerDay,
      maxCommentsPerHour,
    } = req.body;

    if (platformName) settings.platformName = platformName;
    if (tagline) settings.tagline = tagline;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (paymentQrCode) settings.paymentQrCode = paymentQrCode;
    if (paymentInstructions) settings.paymentInstructions = paymentInstructions;
    if (paymentPhone) settings.paymentPhone = paymentPhone;
    if (heroSmallLabel) settings.heroSmallLabel = heroSmallLabel;
    if (heroHeadline) settings.heroHeadline = heroHeadline;
    if (heroDescription) settings.heroDescription = heroDescription;
    if (heroImage) settings.heroImage = heroImage;

    if (typeof requirePostApproval === 'boolean') settings.requirePostApproval = requirePostApproval;
    if (typeof requireBlogApproval === 'boolean') settings.requireBlogApproval = requireBlogApproval;
    if (typeof requireOrgVerification === 'boolean') settings.requireOrgVerification = requireOrgVerification;
    if (typeof allowPublicDonations === 'boolean') settings.allowPublicDonations = allowPublicDonations;
    if (typeof allowPublicComments === 'boolean') settings.allowPublicComments = allowPublicComments;
    if (typeof allowRegistrations === 'boolean') settings.allowRegistrations = allowRegistrations;

    if (Array.isArray(prohibitedWords)) settings.prohibitedWords = prohibitedWords;
    if (maxPostsPerDay) settings.maxPostsPerDay = maxPostsPerDay;
    if (maxCommentsPerHour) settings.maxCommentsPerHour = maxCommentsPerHour;

    await settings.save();
    invalidateSettingsCache();

    await createAuditLog({
      adminUser: req.user,
      action: 'Updated Platform Settings & Homepage CMS',
      targetType: 'SETTINGS',
      details: 'Modified general, approval toggles, or homepage CMS content',
      req,
    });

    res.json({
      success: true,
      message: 'Platform settings and CMS content updated successfully',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Staff / Admin Account (Super Admin only)
// @route   DELETE /api/super-admin/staff/:id
// @access  Private/SuperAdmin
const deleteStaffAccount = async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }
    if (staff.role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete Super Admin account' });
    }
    await staff.deleteOne();
    await createAuditLog({
      adminUser: req.user,
      action: `Deleted staff account: ${staff.name} (${staff.email})`,
      targetType: 'USER',
      targetId: staff._id,
      req,
    });
    res.json({ success: true, message: `Staff account ${staff.name} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRechartsAnalytics,
  getApprovalCenterItems,
  handleBulkPostAction,
  getAuditLogs,
  createStaffAccount,
  updateStaffPermissions,
  deleteStaffAccount,
  getPlatformSettings,
  updatePlatformSettings,
};
