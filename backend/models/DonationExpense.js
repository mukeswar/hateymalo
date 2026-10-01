const mongoose = require('mongoose');

const donationExpenseSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationCampaign',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount in NPR is required'],
      min: 1,
    },
    spentDate: {
      type: Date,
      default: Date.now,
    },
    proofImages: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('DonationExpense', donationExpenseSchema);
