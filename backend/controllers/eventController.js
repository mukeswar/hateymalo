const Event = require('../models/Event');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create official admin event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      coverImage,
      category,
      location,
      date,
      startTime,
      endTime,
      maxParticipants,
    } = req.body;

    if (!title || !description || !location || !date) {
      return res.status(400).json({ success: false, message: 'Please provide title, description, location, and date' });
    }

    const event = await Event.create({
      title,
      description,
      coverImage: coverImage || undefined,
      category: category || 'Community Activity',
      location,
      date: new Date(date),
      startTime: startTime || '09:00 AM',
      endTime: endTime || '05:00 PM',
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : 50,
      creator: req.user._id,
      status: 'UPCOMING',
    });

    // Broadcast notification to all active users
    const allUsers = await User.find({ _id: { $ne: req.user._id } }).select('_id');
    for (const u of allUsers) {
      await Notification.create({
        recipient: u._id,
        sender: req.user._id,
        type: 'EVENT',
        title: 'New Official Event Announced 📅',
        message: `Admin announced "${event.title}" on ${new Date(event.date).toLocaleDateString()}`,
        event: event._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Official event created and broadcast to community!',
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getAllEvents = async (req, res) => {
  try {
    const { status, category } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category && category !== 'All') query.category = category;

    const events = await Event.find(query)
      .populate('creator', 'name profilePicture')
      .populate('joinedUsers', 'name profilePicture location')
      .sort({ isFeatured: -1, date: 1 });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name profilePicture email')
      .populate('joinedUsers', 'name profilePicture location bio skills')
      .populate('interestedUsers', 'name profilePicture location bio skills');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Interest in Event
// @route   POST /api/events/:id/interest
// @access  Private
const toggleEventInterest = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const userIdStr = req.user._id.toString();
    const isInterested = event.interestedUsers.some((id) => id.toString() === userIdStr);

    if (isInterested) {
      event.interestedUsers = event.interestedUsers.filter((id) => id.toString() !== userIdStr);
    } else {
      event.interestedUsers.push(req.user._id);
    }

    await event.save();
    res.json({
      success: true,
      message: isInterested ? 'Removed from interested events' : 'Marked interest in event ❤️',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join / Leave Official Event (Respects maxParticipants limit!)
// @route   POST /api/events/:id/join
// @access  Private
const toggleEventJoin = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'This event has been cancelled' });
    }

    const userIdStr = req.user._id.toString();
    const isJoined = event.joinedUsers.some((id) => id.toString() === userIdStr);

    if (isJoined) {
      event.joinedUsers = event.joinedUsers.filter((id) => id.toString() !== userIdStr);
    } else {
      if (event.joinedUsers.length >= event.maxParticipants) {
        return res.status(400).json({
          success: false,
          message: `Event is full! Maximum limit of ${event.maxParticipants} participants reached.`,
        });
      }
      event.joinedUsers.push(req.user._id);
    }

    await event.save();

    res.json({
      success: true,
      message: isJoined ? 'Left event' : 'Successfully registered & joined event! 📅',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Event (Admin only)
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const { status, title, description, location, date, startTime, endTime, maxParticipants } = req.body;

    if (status) event.status = status;
    if (title) event.title = title;
    if (description) event.description = description;
    if (location) event.location = location;
    if (date) event.date = new Date(date);
    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;
    if (maxParticipants) event.maxParticipants = parseInt(maxParticipants);

    await event.save();

    // Notify registered participants of changes
    for (const participantId of event.joinedUsers) {
      await Notification.create({
        recipient: participantId,
        sender: req.user._id,
        type: 'EVENT',
        title: `Event ${status === 'CANCELLED' ? 'Cancelled ⚠️' : 'Updated 📅'}`,
        message: `Official event "${event.title}" has been ${status === 'CANCELLED' ? 'cancelled' : 'updated by Admin'}.`,
        event: event._id,
      });
    }

    res.json({
      success: true,
      message: 'Event updated and notifications sent to participants',
      data: event,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Featured status for an event (Admin only)
// @route   PUT /api/events/:id/feature
// @access  Private/Admin
const toggleFeaturedEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const { isFeatured } = req.body;
    event.isFeatured = typeof isFeatured === 'boolean' ? isFeatured : !event.isFeatured;
    await event.save();
    res.json({
      success: true,
      message: event.isFeatured ? 'Event featured on homepage' : 'Event removed from featured',
      data: { _id: event._id, isFeatured: event.isFeatured },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Event (Admin only)
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Notify registered participants that the event is gone.
    for (const participantId of event.joinedUsers) {
      await Notification.create({
        recipient: participantId,
        sender: req.user._id,
        type: 'EVENT',
        title: 'Event Removed ⚠️',
        message: `The official event "${event.title}" has been removed by the administrators.`,
      });
    }

    await event.deleteOne();
    // Clean up dangling notifications that referenced this event.
    await Notification.deleteMany({ event: event._id });
    res.json({ success: true, message: 'Official event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  toggleEventInterest,
  toggleEventJoin,
  updateEvent,
  toggleFeaturedEvent,
  deleteEvent,
};
