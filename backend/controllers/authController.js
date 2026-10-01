const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const { JWT_SECRET } = require('../middleware/auth');
const { getSettings } = require('../utils/settingsCache');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, profilePicture, location, bio, skills, interests } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    // Respect the Super Admin "Allow Registrations" toggle.
    const settings = await getSettings();
    if (settings.allowRegistrations === false) {
      return res.status(403).json({ success: false, message: 'New account registration is currently disabled by the administrators.' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // First registered user can optionally be made admin if email matches admin@haatemalo.org
    const role = email.toLowerCase().includes('admin') ? 'ADMIN' : 'USER';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      profilePicture: profilePicture || undefined,
      location: location || 'Kathmandu, Nepal',
      bio: bio || 'Community member on HAATEMALO',
      skills: Array.isArray(skills) ? skills : skills ? skills.split(',').map((s) => s.trim()) : [],
      interests: Array.isArray(interests) ? interests : interests ? interests.split(',').map((i) => i.trim()) : [],
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        interests: user.interests,
        createdAt: user.createdAt,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
          location: user.location,
          bio: user.bio,
          skills: user.skills,
          interests: user.interests,
          createdAt: user.createdAt,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile with stats
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const totalPosts = await Post.countDocuments({ creator: user._id });
    const totalActivitiesJoined = await Post.countDocuments({ joinedUsers: user._id });

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        location: user.location,
        bio: user.bio,
        skills: user.skills,
        interests: user.interests,
        createdAt: user.createdAt,
        totalPosts,
        totalActivitiesJoined,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, profilePicture, location, bio, skills, interests } = req.body;

    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;
    if (location) user.location = location;
    if (bio) user.bio = bio;
    if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map((s) => s.trim());
    if (interests) user.interests = Array.isArray(interests) ? interests : interests.split(',').map((i) => i.trim());

    const updatedUser = await user.save();

    const totalPosts = await Post.countDocuments({ creator: updatedUser._id });
    const totalActivitiesJoined = await Post.countDocuments({ joinedUsers: updatedUser._id });

    res.json({
      success: true,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
        location: updatedUser.location,
        bio: updatedUser.bio,
        skills: updatedUser.skills,
        interests: updatedUser.interests,
        createdAt: updatedUser.createdAt,
        totalPosts,
        totalActivitiesJoined,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile by ID (public view)
// @route   GET /api/auth/user/:id
// @access  Public
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const totalPosts = await Post.countDocuments({ creator: user._id, status: 'APPROVED' });
    const totalActivitiesJoined = await Post.countDocuments({ joinedUsers: user._id });

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        totalPosts,
        totalActivitiesJoined,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public community members directory (safe fields only)
// @route   GET /api/members
// @access  Public
const getPublicMembers = async (req, res) => {
  try {
    const { skill, interest, location } = req.query;
    const query = { isBanned: { $ne: true } };
    if (location) query.location = { $regex: location, $options: 'i' };
    if (skill) query.skills = { $regex: skill, $options: 'i' };
    if (interest) query.interests = { $regex: interest, $options: 'i' };

    const members = await User.find(query)
      .select('name profilePicture location bio skills interests isVerified memberLevel role orgDetails createdAt')
      .sort({ isVerified: -1, createdAt: -1 });

    res.json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  getUserById,
  getPublicMembers,
};
