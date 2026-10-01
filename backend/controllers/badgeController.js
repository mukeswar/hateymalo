const Post = require('../models/Post');
const Event = require('../models/Event');
const Blog = require('../models/Blog');
const Donation = require('../models/Donation');

// @desc    Get compute unlocked community badges for user
// @route   GET /api/badges/user/:userId
// @access  Public
const getUserBadges = async (req, res) => {
  try {
    const userId = req.params.userId;

    const [createdPosts, joinedPosts, joinedEvents, userBlogs, userDonations] = await Promise.all([
      Post.find({ creator: userId, status: 'APPROVED' }),
      Post.find({ joinedUsers: userId, status: 'APPROVED' }),
      Event.find({ joinedUsers: userId }),
      Blog.find({ author: userId, status: 'APPROVED' }),
      Donation.find({ donor: userId }),
    ]);

    const badges = [];

    // 1. 🏆 First Helper
    if (createdPosts.length >= 1 || joinedPosts.length >= 1) {
      badges.push({
        id: 'first_helper',
        title: 'First Helper 🏆',
        description: 'Initiated or participated in your first community initiative.',
        icon: '🏆',
        color: 'from-amber-500 to-yellow-400',
      });
    }

    // 2. 🤝 Active Volunteer
    const totalJoined = joinedPosts.length + joinedEvents.length;
    if (totalJoined >= 3) {
      badges.push({
        id: 'active_volunteer',
        title: 'Active Volunteer 🤝',
        description: `Joined ${totalJoined} community activities & official events.`,
        icon: '🤝',
        color: 'from-teal-500 to-emerald-400',
      });
    }

    // 3. 🌳 Environmental Hero
    const ecoActivities = [...joinedPosts, ...createdPosts].filter(
      (p) => p.category === 'Plantation' || p.category === 'Cleaning' || p.category === 'Disaster Relief'
    );
    if (ecoActivities.length >= 1) {
      badges.push({
        id: 'environmental_hero',
        title: 'Environmental Hero 🌳',
        description: 'Participated in tree plantation, river cleaning, or green civic drives.',
        icon: '🌳',
        color: 'from-emerald-500 to-green-400',
      });
    }

    // 4. ❤️ Community Contributor
    const totalInterestReceived = createdPosts.reduce((sum, p) => sum + (p.interestedUsers?.length || 0), 0);
    if (userDonations.length >= 1 || totalInterestReceived >= 5) {
      badges.push({
        id: 'community_contributor',
        title: 'Community Contributor ❤️',
        description: 'Made voluntary donations or garnered high community interest.',
        icon: '❤️',
        color: 'from-rose-500 to-pink-400',
      });
    }

    // 5. 📚 Education Helper
    const eduActivities = [...joinedPosts, ...createdPosts].filter(
      (p) => p.category === 'Education' || p.category === 'Blood Donation'
    );
    if (eduActivities.length >= 1) {
      badges.push({
        id: 'education_helper',
        title: 'Education Helper 📚',
        description: 'Guided students, tutored assignment help, or supported learning.',
        icon: '📚',
        color: 'from-sky-500 to-blue-400',
      });
    }

    // 6. 📝 Active Writer
    if (userBlogs.length >= 2) {
      badges.push({
        id: 'active_writer',
        title: 'Active Writer 📝',
        description: 'Published 2+ inspiring community blog stories.',
        icon: '📝',
        color: 'from-purple-500 to-indigo-400',
      });
    }

    res.json({
      success: true,
      count: badges.length,
      data: badges,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUserBadges };
