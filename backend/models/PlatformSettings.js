const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    // General Settings
    platformName: {
      type: String,
      default: 'हातेमालो (HAATEMALO)',
    },
    tagline: {
      type: String,
      default: 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।',
    },
    contactEmail: {
      type: String,
      default: 'support@haatemalo.org',
    },
    
    // Payment QR Code & Settings
    paymentQrCode: {
      type: String,
      default: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HAATEMALO-DONATION-OFFICIAL-QR',
    },
    paymentInstructions: {
      type: String,
      default: 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution. Enter Transaction ID on confirmation.',
    },
    paymentPhone: {
      type: String,
      default: '+977 9800000000',
    },

    // Homepage CMS Settings
    heroSmallLabel: {
      type: String,
      default: 'Together, We Can Make a Difference',
    },
    heroHeadline: {
      type: String,
      default: 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।',
    },
    heroDescription: {
      type: String,
      default: 'हातेमालो is a community platform where people can ask for help, offer their skills, join meaningful activities, and create positive change together.',
    },
    heroImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80',
    },

    // Content Approval Controls
    requirePostApproval: {
      type: Boolean,
      default: true,
    },
    requireBlogApproval: {
      type: Boolean,
      default: true,
    },
    requireOrgVerification: {
      type: Boolean,
      default: true,
    },
    allowPublicDonations: {
      type: Boolean,
      default: true,
    },
    allowPublicComments: {
      type: Boolean,
      default: true,
    },
    allowRegistrations: {
      type: Boolean,
      default: true,
    },

    // Moderation & Safety Settings
    prohibitedWords: {
      type: [String],
      default: ['scam', 'fraud', 'illegal', 'hate', 'gambling'],
    },
    maxPostsPerDay: {
      type: Number,
      default: 5,
    },
    maxCommentsPerHour: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
