const Post = require('../models/Post');
const Comment = require('../models/Comment');
const PostUpdate = require('../models/PostUpdate');
const CommentReport = require('../models/CommentReport');
const Notification = require('../models/Notification');
const { isStaff } = require('../utils/roles');
const { getSettings } = require('../utils/settingsCache');

// @desc    Toggle Interest (❤️) on a post
// @route   POST /api/interactions/posts/:id/interest
// @access  Private
const toggleInterest = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Cannot show interest in unapproved post' });
    }

    const userIdStr = req.user._id.toString();
    const isInterested = post.interestedUsers.some((id) => id.toString() === userIdStr);

    if (isInterested) {
      // Remove interest
      post.interestedUsers = post.interestedUsers.filter((id) => id.toString() !== userIdStr);
    } else {
      // Add interest
      post.interestedUsers.push(req.user._id);

      // Emit Notification to post creator (if not self)
      if (post.creator.toString() !== userIdStr) {
        await Notification.create({
          recipient: post.creator,
          sender: req.user._id,
          type: 'INTEREST',
          title: 'New Interested Member ❤️',
          message: `${req.user.name} showed interest in your post "${post.title}"`,
          post: post._id,
        });
      }
    }

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('creator', 'name profilePicture location email')
      .populate('joinedUsers', 'name profilePicture location')
      .populate('interestedUsers', 'name profilePicture location bio skills');

    res.json({
      success: true,
      message: isInterested ? 'Removed from interested' : 'Marked as interested ❤️',
      data: updatedPost,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get interested users for a post
// @route   GET /api/interactions/posts/:id/interested-users
// @access  Public / Private
const getInterestedUsers = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'interestedUsers',
      'name profilePicture location bio skills interests'
    );

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({
      success: true,
      count: post.interestedUsers.length,
      data: post.interestedUsers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment or reply
// @route   POST /api/interactions/posts/:id/comments
// @access  Private
const createComment = async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    // Respect the Super Admin "Allow Public Comments" toggle (staff bypass it).
    const settings = await getSettings();
    if (!settings.allowPublicComments && !isStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Commenting is currently disabled by the administrators.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      content: content.trim(),
      parentComment: parentComment || null,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name profilePicture role'
    );

    // Trigger Notification
    if (parentComment) {
      // Reply notification
      const parent = await Comment.findById(parentComment);
      if (parent && parent.author.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: parent.author,
          sender: req.user._id,
          type: 'REPLY',
          title: 'New Reply to your comment 💬',
          message: `${req.user.name} replied to your comment on "${post.title}"`,
          post: post._id,
        });
      }
    } else {
      // Top-level comment notification to creator
      if (post.creator.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: post.creator,
          sender: req.user._id,
          type: 'COMMENT',
          title: 'New Comment on your post 💬',
          message: `${req.user.name} commented on "${post.title}"`,
          post: post._id,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: populatedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get threaded comments for a post
// @route   GET /api/interactions/posts/:id/comments
// @access  Public
const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name profilePicture role')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Edit comment
// @route   PUT /api/interactions/comments/:commentId
// @access  Private (Author only)
const editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    comment.content = content.trim();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      'author',
      'name profilePicture role'
    );

    res.json({
      success: true,
      message: 'Comment updated',
      data: updatedComment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete comment
// @route   DELETE /api/interactions/comments/:commentId
// @access  Private (Author or Admin)
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = isStaff(req.user);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();
    // Delete replies to this comment
    await Comment.deleteMany({ parentComment: req.params.commentId });

    res.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report inappropriate comment
// @route   POST /api/interactions/comments/:commentId/report
// @access  Private
const reportComment = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Report reason is required' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    comment.isReported = true;
    comment.reportReason = reason.trim();
    await comment.save();

    await CommentReport.create({
      comment: comment._id,
      reporter: req.user._id,
      reason: reason.trim(),
    });

    res.json({
      success: true,
      message: 'Comment reported for admin review. Thank you for keeping our community safe.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Post Update announcement
// @route   POST /api/interactions/posts/:id/updates
// @access  Private (Creator only)
const createPostUpdate = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Update content is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the post creator can post updates' });
    }

    const update = await PostUpdate.create({
      post: post._id,
      author: req.user._id,
      content: content.trim(),
    });

    const populatedUpdate = await PostUpdate.findById(update._id).populate(
      'author',
      'name profilePicture'
    );

    // Notify all interested & joined users!
    const targetUserIds = [
      ...post.joinedUsers.map((u) => u.toString()),
      ...post.interestedUsers.map((u) => u.toString()),
    ];
    const uniqueRecipients = [...new Set(targetUserIds)].filter(
      (idStr) => idStr !== req.user._id.toString()
    );

    for (const recipientId of uniqueRecipients) {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'POST_UPDATE',
        title: 'Campaign Update Published 📢',
        message: `Update on "${post.title}": ${content.trim().substring(0, 80)}...`,
        post: post._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post update published and notifications sent to interested/joined members!',
      data: populatedUpdate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get updates for a post
// @route   GET /api/interactions/posts/:id/updates
// @access  Public
const getPostUpdates = async (req, res) => {
  try {
    const updates = await PostUpdate.find({ post: req.params.id })
      .populate('author', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: updates.length,
      data: updates,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  toggleInterest,
  getInterestedUsers,
  createComment,
  getPostComments,
  editComment,
  deleteComment,
  reportComment,
  createPostUpdate,
  getPostUpdates,
};
