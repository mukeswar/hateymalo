const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
      default: 'USER',
    },
    permissions: {
      type: [String],
      default: [], // e.g. ['canApprovePosts', 'canDeletePosts', 'canManageUsers', 'canManageDonations', 'canManageEvents', 'canManageBlogs', 'canManageOrganizations', 'canSendNotifications', 'canChangeSettings']
    },
    memberLevel: {
      type: String,
      enum: ['NEW MEMBER', 'TRUSTED MEMBER', 'VERIFIED MEMBER', 'ORGANIZATION', 'ADMIN'],
      default: 'NEW MEMBER',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },
    warnings: {
      type: [
        {
          reason: { type: String, default: '' },
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    orgDetails: {
      orgName: { type: String, default: '' },
      orgType: { type: String, enum: ['', 'NGO', 'School', 'College', 'Community Group', 'Social Organization', 'Club'], default: '' },
      website: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    profilePicture: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    },
    location: {
      type: String,
      default: 'Kathmandu, Nepal',
    },
    bio: {
      type: String,
      default: 'Passionate about community support and mutual help.',
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ name: 'text', skills: 'text', interests: 'text', location: 'text' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
