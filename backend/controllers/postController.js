const Post = require('../models/Post');
const { isStaff } = require('../utils/roles');
const { hasPermission } = require('../utils/permissions');
const { getSettings } = require('../utils/settingsCache');

// Public creator fields; email is private and only shown to staff.
const creatorFields = (staff, extra = '') =>
  `name profilePicture location memberLevel isVerified role ${staff ? 'email ' : ''}${extra}`.trim();

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      images,
      requiredMembers,
      dateTime,
      status,
    } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, category, and location',
      });
    }

    // Reject submissions to a deactivated category (staff bypass).
    if (!isStaff(req.user)) {
      const Category = require('../models/Category');
      const cat = await Category.findOne({ name: category });
      if (cat && cat.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'This category is not currently accepting new submissions.',
        });
      }
    }

    const settings = await getSettings();

    // Enforce per-user daily post limit for non-staff members.
    if (!isStaff(req.user) && settings.maxPostsPerDay > 0) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const postsToday = await Post.countDocuments({
        creator: req.user._id,
        createdAt: { $gte: since },
        status: { $ne: 'DRAFT' },
      });
      if (postsToday >= settings.maxPostsPerDay) {
        return res.status(429).json({
          success: false,
          message: `Daily posting limit reached (${settings.maxPostsPerDay} posts/day). Please try again tomorrow.`,
        });
      }
    }

    // Approval workflow is driven by the Super Admin "Require Post Approval" setting.
    //  - DRAFT stays a draft.
    //  - Staff may publish directly by requesting APPROVED.
    //  - If approval is NOT required, member posts auto-publish (APPROVED).
    //  - Otherwise member posts go to the moderation queue (PENDING).
    let initialStatus;
    if (status === 'DRAFT') {
      initialStatus = 'DRAFT';
    } else if (isStaff(req.user) && status === 'APPROVED') {
      initialStatus = 'APPROVED';
    } else if (!settings.requirePostApproval) {
      initialStatus = 'APPROVED';
    } else {
      initialStatus = 'PENDING';
    }

    const post = await Post.create({
      title,
      description,
      category,
      location,
      images: Array.isArray(images) && images.length > 0 ? images : undefined,
      requiredMembers: requiredMembers || 1,
      dateTime: dateTime || Date.now(),
      creator: req.user._id,
      status: initialStatus,
    });

    const populatedPost = await Post.findById(post._id).populate(
      'creator',
      'name profilePicture location email'
    );

    res.status(201).json({
      success: true,
      message:
        initialStatus === 'PENDING'
          ? 'Post created successfully! It is pending admin approval before appearing publicly.'
          : 'Post created successfully!',
      data: populatedPost,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get public approved posts (with filters & search)
// @route   GET /api/posts
// @access  Public
const getPublicPosts = async (req, res) => {
  try {
    const { category, location, search, sort, status, featured } = req.query;

    // Unmoderated (pending/rejected/draft) posts: staff who moderate see all of
    // them; a signed-in member sees only their own; anonymous callers none.
    const moderator = req.user && hasPermission(req.user, 'canApprovePosts');
    const staff = req.user && isStaff(req.user);
    let query = {};
    const restrict = [];
    if (status && status !== 'ALL') {
      query.status = status;
      if (status !== 'APPROVED' && !moderator) {
        if (!req.user) query.status = 'APPROVED';
        else query.creator = req.user._id;
      }
    } else if (!status) {
      query.status = 'APPROVED';
    } else if (!moderator) {
      restrict.push(req.user ? { $or: [{ status: 'APPROVED' }, { creator: req.user._id }] } : { status: 'APPROVED' });
    }

    // Featured filter: only currently-featured (non-expired) posts.
    const featuredOnly = featured === 'true' || featured === '1';
    if (featuredOnly) {
      query.isFeatured = true;
      query.$and = [
        { $or: [{ featuredUntil: null }, { featuredUntil: { $gt: new Date() } }] },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (featuredOnly) sortOption = { featuredOrder: 1, createdAt: -1 };

    if (restrict.length) query.$and = [...(query.$and || []), ...restrict];

    const posts = await Post.find(query)
      .populate('creator', creatorFields(staff))
      .populate('joinedUsers', 'name profilePicture location')
      .sort(sortOption);

    res.json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public (Conditional for non-approved posts)
const getPostById = async (req, res) => {
  try {
    const staff = req.user && isStaff(req.user);
    const post = await Post.findById(req.params.id)
      .populate('creator', creatorFields(staff, 'bio skills'))
      .populate('joinedUsers', 'name profilePicture location bio skills');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Non-approved posts are visible only to their creator and to staff
    // (optionalAuth has verified the token; a bare header no longer unlocks them).
    if (post.status !== 'APPROVED') {
      const isCreator = req.user && post.creator?._id?.toString() === req.user._id.toString();
      if (!isCreator && !staff) {
        return res.status(403).json({
          success: false,
          message: 'This post is currently pending review or not public.',
        });
      }
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user dashboard posts (Created by user or Joined by user)
// @route   GET /api/posts/user/my-posts
// @access  Private
const getUserPosts = async (req, res) => {
  try {
    const createdPosts = await Post.find({ creator: req.user._id })
      .populate('creator', 'name profilePicture location')
      .populate('joinedUsers', 'name profilePicture location')
      .sort({ createdAt: -1 });

    const joinedPosts = await Post.find({ joinedUsers: req.user._id })
      .populate('creator', 'name profilePicture location')
      .populate('joinedUsers', 'name profilePicture location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        createdPosts,
        joinedPosts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join or leave an activity post
// @route   POST /api/posts/:id/join
// @access  Private
const joinPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Cannot join an unapproved post' });
    }

    const userIdStr = req.user._id.toString();
    const isJoined = post.joinedUsers.some((id) => id.toString() === userIdStr);

    if (isJoined) {
      // Leave post
      post.joinedUsers = post.joinedUsers.filter((id) => id.toString() !== userIdStr);
    } else {
      // Join post
      post.joinedUsers.push(req.user._id);

      // Trigger Notification to post creator (if not self)
      const Notification = require('../models/Notification');
      if (post.creator.toString() !== userIdStr) {
        await Notification.create({
          recipient: post.creator,
          sender: req.user._id,
          type: 'JOIN',
          title: 'New Volunteer Joined 🤝',
          message: `${req.user.name} joined your community activity "${post.title}"`,
          post: post._id,
        });
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('creator', 'name profilePicture location email')
      .populate('joinedUsers', 'name profilePicture location');

    res.json({
      success: true,
      message: isJoined ? 'Successfully left activity' : 'Successfully joined activity!',
      data: updatedPost,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update post status (Approve, Reject, Complete)
// @route   PUT /api/posts/:id/status
// @access  Private (Admin for Approve/Reject, Creator for Complete)
const updatePostStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Role checks — moderation actions are allowed for any staff role
    // (SUPER_ADMIN, ADMIN, MODERATOR), not just an exact 'ADMIN'.
    if (['APPROVED', 'REJECTED', 'HIDDEN', 'ARCHIVED'].includes(status)) {
      if (!hasPermission(req.user, 'canApprovePosts')) {
        return res.status(403).json({ success: false, message: 'Only moderators or admins can change moderation status' });
      }
    }

    if (status === 'COMPLETED') {
      const isCreator = post.creator.toString() === req.user._id.toString();
      const isAdmin = isStaff(req.user);
      if (!isCreator && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Only the creator or an admin can mark a post as completed' });
      }
    }

    post.status = status;
    if (status === 'REJECTED') {
      post.rejectionReason = rejectionReason || 'Content does not meet community guidelines.';
    } else {
      post.rejectionReason = '';
    }

    await post.save();

    // Trigger Notification to Post Creator
    const Notification = require('../models/Notification');
    if (['APPROVED', 'REJECTED'].includes(status)) {
      await Notification.create({
        recipient: post.creator,
        sender: req.user._id,
        type: status === 'APPROVED' ? 'POST_APPROVED' : 'POST_REJECTED',
        title: status === 'APPROVED' ? 'Post Approved 🎉' : 'Post Reviewed / Rejected ⚠️',
        message: status === 'APPROVED' 
          ? `Your post "${post.title}" has been approved and is now public!` 
          : `Your post "${post.title}" was not approved. Reason: ${post.rejectionReason}`,
        post: post._id,
      });
    }

    const updatedPost = await Post.findById(post._id)
      .populate('creator', 'name profilePicture location email')
      .populate('joinedUsers', 'name profilePicture location');

    res.json({
      success: true,
      message: `Post status updated to ${status}`,
      data: updatedPost,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle / set Featured status for a post (Admin only)
// @route   PUT /api/posts/:id/feature
// @access  Private/Staff
const toggleFeaturedPost = async (req, res) => {
  try {
    if (!hasPermission(req.user, 'canApprovePosts')) {
      return res.status(403).json({ success: false, message: 'Only moderators or admins can feature posts' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const { isFeatured, featuredOrder, featuredDays } = req.body;

    // Explicit value if provided, otherwise toggle.
    post.isFeatured = typeof isFeatured === 'boolean' ? isFeatured : !post.isFeatured;

    if (post.isFeatured) {
      if (typeof featuredOrder === 'number') post.featuredOrder = featuredOrder;
      if (featuredDays && Number(featuredDays) > 0) {
        const until = new Date();
        until.setDate(until.getDate() + Number(featuredDays));
        post.featuredUntil = until;
      }
    } else {
      // Clearing featured resets ordering/expiry.
      post.featuredOrder = 0;
      post.featuredUntil = null;
    }

    await post.save();

    res.json({
      success: true,
      message: post.isFeatured ? 'Post marked as Featured' : 'Post removed from Featured',
      data: { _id: post._id, isFeatured: post.isFeatured, featuredOrder: post.featuredOrder, featuredUntil: post.featuredUntil },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (Admin or Creator)
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isCreator = post.creator.toString() === req.user._id.toString();
    const isAdmin = hasPermission(req.user, 'canDeletePosts');

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    // Clean up references so deleted posts leave no dangling data.
    const Comment = require('../models/Comment');
    const Notification = require('../models/Notification');
    const DonationCampaign = require('../models/DonationCampaign');
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });
    await DonationCampaign.updateMany({ post: post._id }, { $set: { post: null } });

    res.json({
      success: true,
      message: 'Post removed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPost,
  getPublicPosts,
  getPostById,
  getUserPosts,
  joinPost,
  updatePostStatus,
  toggleFeaturedPost,
  deletePost,
};
