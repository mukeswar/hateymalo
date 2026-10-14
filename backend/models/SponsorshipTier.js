const mongoose = require('mongoose');

// A sponsorship package. `opportunity: null` = a reusable template the admin
// copies onto campaigns; otherwise it belongs to one opportunity. Names,
// prices, benefits and slots are all admin-managed, never hardcoded.
const tierSchema = new mongoose.Schema(
  {
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipOpportunity', default: null },
    name: { type: String, required: [true, 'Tier name is required'], trim: true, maxlength: 80 },
    level: {
      type: String,
      enum: ['TITLE', 'GOLD', 'SILVER', 'BRONZE', 'COMMUNITY_PARTNER', 'MEDIA_PARTNER', 'IN_KIND', 'CUSTOM'],
      default: 'CUSTOM',
    },
    description: { type: String, default: '', maxlength: 1000 },
    price: { type: Number, default: 0, min: 0 }, // whole NPR; 0 = in-kind or by quotation
    priceNote: { type: String, default: '', maxlength: 120 }, // e.g. "or equivalent in materials"
    benefits: { type: [String], default: [] },
    logoSize: { type: String, enum: ['XL', 'L', 'M', 'S', 'NONE'], default: 'M' },
    slots: { type: Number, default: 1, min: 0 }, // 0 = unlimited
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

tierSchema.index({ opportunity: 1, order: 1 });

module.exports = mongoose.model('SponsorshipTier', tierSchema);
