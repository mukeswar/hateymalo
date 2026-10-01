const User = require('../models/User');
const Post = require('../models/Post');
const Event = require('../models/Event');
const Donation = require('../models/Donation');

// @desc    Public community statistics for the homepage (real data, no admin auth)
// @route   GET /api/stats
// @access  Public
const getPublicStats = async (req, res) => {
  try {
    const totalMembers = await User.countDocuments();
    const approvedPosts = await Post.countDocuments({ status: 'APPROVED' });
    const completedPosts = await Post.countDocuments({ status: 'COMPLETED' });
    const totalActivities = approvedPosts + completedPosts;
    const upcomingEvents = await Event.countDocuments({ status: 'UPCOMING' });

    // "Communities reached" = distinct locations across approved posts.
    const locations = await Post.distinct('location', { status: { $in: ['APPROVED', 'COMPLETED'] } });
    const communitiesReached = locations.filter(Boolean).length;

    // Connections = total joins across approved/completed posts.
    const joinAgg = await Post.aggregate([
      { $match: { status: { $in: ['APPROVED', 'COMPLETED'] } } },
      { $project: { joins: { $size: { $ifNull: ['$joinedUsers', []] } } } },
      { $group: { _id: null, total: { $sum: '$joins' } } },
    ]);
    const peopleConnected = joinAgg[0]?.total || 0;

    const donations = await Donation.find().select('amount');
    const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

    res.json({
      success: true,
      data: {
        totalMembers,
        totalActivities,
        peopleConnected,
        communitiesReached,
        upcomingEvents,
        totalDonations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPublicStats };
