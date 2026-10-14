const Post = require('../models/Post');
const Event = require('../models/Event');
const Blog = require('../models/Blog');
const User = require('../models/User');

// Search is public: only profile fields anyone may see (no email, moderation
// state or permissions). Organisations keep their public contact details.
const PUBLIC_USER_FIELDS = 'name profilePicture location bio skills interests memberLevel isVerified role orgDetails createdAt';

// @desc    Global universal search across all entities
// @route   GET /api/search
// @access  Public
const globalSearch = async (req, res) => {
  try {
    const { query = '', category = '', location = '', entityType = 'ALL' } = req.query;

    const regex = query ? new RegExp(query, 'i') : null;
    let results = {
      posts: [],
      events: [],
      blogs: [],
      members: [],
      organizations: [],
    };

    // 1. Posts Search (Approved only)
    if (entityType === 'ALL' || entityType === 'POSTS') {
      let postQuery = { status: 'APPROVED' };
      if (regex) {
        postQuery.$or = [
          { title: regex },
          { description: regex },
          { location: regex },
          { category: regex },
        ];
      }
      if (category && category !== 'All') postQuery.category = category;
      if (location) postQuery.location = new RegExp(location, 'i');

      results.posts = await Post.find(postQuery)
        .populate('creator', 'name profilePicture isVerified memberLevel')
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // 2. Events Search
    if (entityType === 'ALL' || entityType === 'EVENTS') {
      let eventQuery = {};
      if (regex) {
        eventQuery.$or = [
          { title: regex },
          { description: regex },
          { location: regex },
          { category: regex },
        ];
      }
      if (category && category !== 'All') eventQuery.category = category;
      if (location) eventQuery.location = new RegExp(location, 'i');

      results.events = await Event.find(eventQuery)
        .populate('creator', 'name profilePicture')
        .sort({ date: 1 })
        .limit(20);
    }

    // 3. Blogs Search (Approved only)
    if (entityType === 'ALL' || entityType === 'BLOGS') {
      let blogQuery = { status: 'APPROVED' };
      if (regex) {
        blogQuery.$or = [
          { title: regex },
          { content: regex },
          { category: regex },
        ];
      }
      if (category && category !== 'All') blogQuery.category = category;

      results.blogs = await Blog.find(blogQuery)
        .populate('author', 'name profilePicture isVerified memberLevel')
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // 4. Members Search
    if (entityType === 'ALL' || entityType === 'MEMBERS') {
      let memberQuery = { memberLevel: { $ne: 'ORGANIZATION' }, isBanned: { $ne: true } };
      if (regex) {
        memberQuery.$or = [
          { name: regex },
          { bio: regex },
          { skills: regex },
          { interests: regex },
          { location: regex },
        ];
      }
      if (location) memberQuery.location = new RegExp(location, 'i');

      results.members = await User.find(memberQuery)
        .select(PUBLIC_USER_FIELDS)
        .sort({ isVerified: -1, createdAt: -1 })
        .limit(20);
    }

    // 5. Organizations Search
    if (entityType === 'ALL' || entityType === 'ORGANIZATIONS') {
      let orgQuery = {
        isBanned: { $ne: true },
        $or: [
          { memberLevel: 'ORGANIZATION' },
          { 'orgDetails.orgName': { $ne: '' } },
        ],
      };
      if (regex) {
        orgQuery.$and = [
          {
            $or: [
              { name: regex },
              { 'orgDetails.orgName': regex },
              { 'orgDetails.description': regex },
              { location: regex },
            ],
          },
        ];
      }

      results.organizations = await User.find(orgQuery)
        .select(PUBLIC_USER_FIELDS)
        .sort({ isVerified: -1, createdAt: -1 })
        .limit(20);
    }

    const totalResultsCount =
      results.posts.length +
      results.events.length +
      results.blogs.length +
      results.members.length +
      results.organizations.length;

    res.json({
      success: true,
      query,
      count: totalResultsCount,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { globalSearch };
