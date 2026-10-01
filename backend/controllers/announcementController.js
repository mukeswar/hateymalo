const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Event = require('../models/Event');

// @desc    Create Admin Announcement
// @route   POST /api/announcements
// @access  Private/Admin
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, target, category, eventId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const announcement = await Announcement.create({
      title,
      content,
      target: target || 'ALL',
      category: category || '',
      event: eventId || null,
      createdBy: req.user._id,
    });

    // Resolve recipients based on the selected target audience.
    let recipientIds = [];
    if (announcement.target === 'EVENT' && (eventId || '')) {
      const ev = await Event.findById(eventId).select('joinedUsers interestedUsers');
      if (ev) {
        recipientIds = [
          ...ev.joinedUsers.map((id) => id.toString()),
          ...ev.interestedUsers.map((id) => id.toString()),
        ];
      }
    } else if (announcement.target === 'CATEGORY' && (category || '')) {
      const interested = await User.find({ interests: category }).select('_id');
      recipientIds = interested.map((u) => u._id.toString());
    } else {
      const allUsers = await User.find().select('_id');
      recipientIds = allUsers.map((u) => u._id.toString());
    }

    // De-dupe and never notify the sender.
    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (id) => id !== req.user._id.toString()
    );

    for (const recipientId of uniqueRecipients) {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'ANNOUNCEMENT',
        title: `📢 Announcement: ${title}`,
        message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        announcement: announcement._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Announcement broadcast to community successfully',
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active announcements
// @route   GET /api/announcements
// @access  Public
const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      count: announcements.length,
      data: announcements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getActiveAnnouncements,
};
