const mongoose = require('mongoose');

const donationCampaignSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    title: {
      type: String,
      required: [true, 'Campaign title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    goalAmount: {
      type: Number,
      required: [true, 'Goal amount (NPR) is required'],
      min: 100,
    },
    raisedAmount: {
      type: Number,
      default: 0,
    },
    donorsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DonationCampaign', donationCampaignSchema);
