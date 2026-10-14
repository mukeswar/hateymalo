const Blog = require('../models/Blog');
const Notification = require('../models/Notification');
const { isStaff } = require('../utils/roles');
const { hasPermission } = require('../utils/permissions');
const { getSettings } = require('../utils/settingsCache');

// @desc    Submit new blog story
// @route   POST /api/blogs
// @access  Private
const createBlog = async (req, res) => {
  try {
    const { title, coverImage, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const settings = await getSettings();
    // Auto-publish when the Super Admin has turned off blog approval, or when staff author.
    const initialStatus = (!settings.requireBlogApproval || isStaff(req.user)) ? 'APPROVED' : 'PENDING';

    const blog = await Blog.create({
      title,
      coverImage: coverImage || undefined,
      content,
      category: category || 'Community Story',
      author: req.user._id,
      status: initialStatus,
    });

    const populatedBlog = await Blog.findById(blog._id).populate('author', 'name profilePicture');

    res.status(201).json({
      success: true,
      message: initialStatus === 'PENDING'
        ? 'Blog submitted successfully! It is pending admin review before public publication.'
        : 'Blog published successfully!',
      data: populatedBlog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get public approved blogs
// @route   GET /api/blogs
// @access  Public
const getPublicBlogs = async (req, res) => {
  try {
    const { category, search, status, featured } = req.query;
    let query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    } else if (!status) {
      query.status = 'APPROVED';
    }

    if (featured === 'true' || featured === '1') query.isFeatured = true;
    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name profilePicture location')
      .sort({ isFeatured: -1, createdAt: -1 });

    res.json({
      success: true,
      count: blogs.length,
      data: blogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single blog details (Increments views count!)
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name profilePicture location bio skills')
      .populate('reactions', 'name profilePicture');

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    // Increment views counter
    blog.views += 1;
    await blog.save();

    res.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle reaction (❤️ / 👍) on blog
// @route   POST /api/blogs/:id/react
// @access  Private
const toggleBlogReaction = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const userIdStr = req.user._id.toString();
    const hasReacted = blog.reactions.some((id) => id.toString() === userIdStr);

    if (hasReacted) {
      blog.reactions = blog.reactions.filter((id) => id.toString() !== userIdStr);
    } else {
      blog.reactions.push(req.user._id);

      if (blog.author.toString() !== userIdStr) {
        await Notification.create({
          recipient: blog.author,
          sender: req.user._id,
          type: 'INTEREST',
          title: 'Someone reacted to your blog ❤️',
          message: `${req.user.name} loved your blog story "${blog.title}"`,
        });
      }
    }

    await blog.save();

    res.json({
      success: true,
      message: hasReacted ? 'Reaction removed' : 'Reacted to blog ❤️',
      data: blog.reactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update blog status (Approve / Reject) (Admin only)
// @route   PUT /api/blogs/:id/status
// @access  Private/Admin
const updateBlogStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.status = status;
    if (status === 'REJECTED') {
      blog.rejectionReason = rejectionReason || 'Content does not align with editorial policies.';
    }

    await blog.save();

    // Trigger Notification
    await Notification.create({
      recipient: blog.author,
      sender: req.user._id,
      type: status === 'APPROVED' ? 'POST_APPROVED' : 'POST_REJECTED',
      title: status === 'APPROVED' ? 'Blog Published 🎉' : 'Blog Status Update ⚠️',
      message: status === 'APPROVED'
        ? `Your blog story "${blog.title}" was approved and published!`
        : `Your blog "${blog.title}" was rejected. Reason: ${blog.rejectionReason}`,
      blog: blog._id,
    });

    res.json({
      success: true,
      message: `Blog status updated to ${status}`,
      data: blog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Featured Blog status (Admin only)
// @route   PUT /api/blogs/:id/feature
// @access  Private/Admin
const toggleFeaturedBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.isFeatured = !blog.isFeatured;
    await blog.save();

    res.json({
      success: true,
      message: blog.isFeatured ? 'Blog marked as Featured' : 'Blog removed from Featured',
      data: blog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Blog
// @route   DELETE /api/blogs/:id
// @access  Private (Author or Admin)
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    const isAuthor = blog.author.toString() === req.user._id.toString();
    const isAdmin = hasPermission(req.user, 'canDeletePosts');

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this blog' });
    }

    await blog.deleteOne();
    res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBlog,
  getPublicBlogs,
  getBlogById,
  toggleBlogReaction,
  updateBlogStatus,
  toggleFeaturedBlog,
  deleteBlog,
};
