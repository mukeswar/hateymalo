const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DonationCampaign',
      default: null,
    },
    type: {
      type: String,
      enum: ['PLATFORM', 'CAMPAIGN'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Donation amount in NPR is required'],
      min: 10,
    },
    paymentMethod: {
      type: String,
      enum: ['eSewa', 'Khalti', 'Fonepay', 'Bank Transfer'],
      default: 'eSewa',
    },
    transactionId: {
      type: String,
      required: true,
    },
    donorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Donation', donationSchema);
