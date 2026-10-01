const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Post description is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    requiredMembers: {
      type: Number,
      default: 5,
    },
    dateTime: {
      type: Date,
      default: Date.now,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'COMPLETED', 'ARCHIVED'],
      default: 'PENDING',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredOrder: {
      type: Number,
      default: 0,
    },
    featuredUntil: {
      type: Date,
      default: null,
    },
    joinedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    interestedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

postSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });

module.exports = mongoose.model('Post', postSchema);
