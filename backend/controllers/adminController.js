const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const CommentReport = require('../models/CommentReport');
const Event = require('../models/Event');
const Blog = require('../models/Blog');
const Donation = require('../models/Donation');
const DonationCampaign = require('../models/DonationCampaign');
const Announcement = require('../models/Announcement');
const Report = require('../models/Report');
const { hasPermission } = require('../utils/permissions');

// @desc    Get admin dashboard statistics (Phases 1, 2, 3, 4)
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ status: 'PENDING' });
    const approvedPosts = await Post.countDocuments({ status: 'APPROVED' });
    const rejectedPosts = await Post.countDocuments({ status: 'REJECTED' });

    const upcomingEvents = await Event.countDocuments({ status: 'UPCOMING' });
    const allEvents = await Event.find().select('joinedUsers');
    const totalEventParticipants = allEvents.reduce((sum, ev) => sum + (ev.joinedUsers ? ev.joinedUsers.length : 0), 0);

    const pendingBlogs = await Blog.countDocuments({ status: 'PENDING' });
    
    // Finance figures only go to staff who hold canViewDonations (moderators don't by default)
    let totalDonationsAmount;
    if (hasPermission(req.user, 'canViewDonations')) {
      const allDonations = await Donation.find().select('amount');
      totalDonationsAmount = allDonations.reduce((sum, d) => sum + d.amount, 0);
    }

    const activeCampaigns = await DonationCampaign.countDocuments({ status: 'ACTIVE' });
    const recentAnnouncements = await Announcement.countDocuments();

    const pendingReports = await Report.countDocuments({ status: 'PENDING' });

    // Category distribution breakdown
    const categoryStats = await Post.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        totalPosts,
        pendingPosts,
        approvedPosts,
        rejectedPosts,
        upcomingEvents,
        totalEventParticipants,
        pendingBlogs,
        totalDonationsAmount,
        activeCampaigns,
        recentAnnouncements,
        pendingReports,
        categoryStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Member Level & Toggle Verification Badge (Admin only)
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Admin
const verifyMember = async (req, res) => {
  try {
    const { memberLevel, isVerified, orgDetails } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (memberLevel) user.memberLevel = memberLevel;
    if (typeof isVerified === 'boolean') user.isVerified = isVerified;
    if (orgDetails) user.orgDetails = { ...user.orgDetails, ...orgDetails };

    await user.save();

    res.json({
      success: true,
      message: `User verification updated to ${user.memberLevel} (Verified: ${user.isVerified})`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        memberLevel: user.memberLevel,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all pending posts for admin moderation
const getPendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({ status: 'PENDING' })
      .populate('creator', 'name profilePicture location email isVerified memberLevel')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users for admin management
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    if (role === 'ADMIN') user.memberLevel = 'ADMIN';
    await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account' });
    }

    await user.deleteOne();
    await Post.deleteMany({ creator: req.params.id });

    res.json({ success: true, message: 'User and associated posts deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending blogs for admin moderation
const getPendingBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'PENDING' })
      .populate('author', 'name profilePicture email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: blogs.length, data: blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle User Account Suspension (Admin only)
const toggleUserSuspension = async (req, res) => {
  try {
    const { isSuspended, suspensionReason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot suspend Super Admin' });
    }

    user.isSuspended = isSuspended;
    user.suspensionReason = isSuspended ? (suspensionReason || 'Account suspended by admin for policy violation.') : '';
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} account ${isSuspended ? 'suspended' : 'reactivated'} successfully.`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all comments across all posts/blogs for moderation
const getAllCommentsAdmin = async (req, res) => {
  try {
    const comments = await Comment.find()
      .populate('author', 'name email profilePicture')
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete comment (Admin)
const deleteCommentAdmin = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all donations for financial ledger
const getAllDonationsAdmin = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donor', 'name email profilePicture')
      .populate('campaign', 'title')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: donations.length, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all expenses across all campaigns
const getAllExpensesAdmin = async (req, res) => {
  try {
    const DonationExpense = require('../models/DonationExpense');
    const expenses = await DonationExpense.find()
      .populate('campaign', 'title')
      .populate('createdBy', 'name email')
      .sort({ spentDate: -1 });
    res.json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete expense record
const deleteExpenseAdmin = async (req, res) => {
  try {
    const DonationExpense = require('../models/DonationExpense');
    const expense = await DonationExpense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    await expense.deleteOne();
    res.json({ success: true, message: 'Expense record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update campaign
const updateCampaignAdmin = async (req, res) => {
  try {
    const { title, description, goalAmount, status } = req.body;
    const campaign = await DonationCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    if (title) campaign.title = title;
    if (description) campaign.description = description;
    if (goalAmount) campaign.goalAmount = parseFloat(goalAmount);
    if (status) campaign.status = status;
    await campaign.save();
    res.json({ success: true, message: 'Campaign updated', data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete campaign
const deleteCampaignAdmin = async (req, res) => {
  try {
    const campaign = await DonationCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    await campaign.deleteOne();
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create / Register an NGO / Partner Organization (Admin)
const createOrganizationAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password = 'orgPassword123',
      location = 'Kathmandu, Nepal',
      phone,
      regNumber,
      orgType = 'NGO',
      description,
      isVerified = true,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const org = await User.create({
      name,
      email,
      password,
      location,
      role: 'USER',
      memberLevel: 'ORGANIZATION',
      isVerified,
      bio: description,
      orgDetails: {
        orgName: name,
        orgType,
        regNumber,
        contactEmail: email,
        contactPhone: phone,
        description,
      },
    });

    // Never send the password hash back to the client
    const { password: _omit, ...orgData } = org.toObject();

    res.status(201).json({
      success: true,
      message: `Organization "${name}" registered successfully!`,
      data: orgData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getPendingPosts,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getPendingBlogs,
  verifyMember,
  toggleUserSuspension,
  getAllCommentsAdmin,
  deleteCommentAdmin,
  getAllDonationsAdmin,
  getAllExpensesAdmin,
  deleteExpenseAdmin,
  updateCampaignAdmin,
  deleteCampaignAdmin,
  createOrganizationAdmin,
};
