const mongoose = require('mongoose');

// A community campaign that is open to sponsors: a cleanup drive, blood
// donation, tree plantation, education support, relief or food distribution.
// It may link to an existing Event and/or DonationCampaign. Its packages live
// in SponsorshipTier; each sponsor's agreement lives in SponsorshipDeal.
const DELIVERABLE_TYPES = [
  'VEST_LOGO',
  'VENUE_BANNER',
  'BACKDROP',
  'ID_CARD',
  'SOCIAL_MENTION',
  'VIDEO',
  'PHOTO_ALBUM',
  'WEBSITE_LISTING',
  'SPEAKING_SLOT',
  'IMPACT_REPORT',
  'OTHER',
];

const RESOURCE_TYPES = ['CASH', 'MATERIALS', 'EQUIPMENT', 'TRANSPORT', 'FOOD', 'UNIFORMS', 'VENUE', 'MEDIA', 'OTHER'];

const BRAND_PLACEMENTS = ['VEST_FRONT', 'VEST_BACK', 'BANNER', 'BACKDROP', 'ID_CARD', 'SIGNAGE'];

const opportunitySchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 160 },
    campaignType: {
      type: String,
      enum: ['CLEANUP', 'BLOOD_DONATION', 'TREE_PLANTATION', 'EDUCATION', 'DISASTER_RELIEF', 'FOOD_DISTRIBUTION', 'HEALTH', 'OTHER'],
      default: 'OTHER',
    },
    summary: { type: String, default: '', maxlength: 300 },
    description: { type: String, default: '', maxlength: 8000 },
    objectives: { type: [String], default: [] },
    coverImage: { type: String, default: '' },
    location: { type: String, default: '', maxlength: 200 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    schedule: { type: String, default: '', maxlength: 2000 },
    expectedAudience: {
      count: { type: Number, default: 0, min: 0 },
      description: { type: String, default: '', maxlength: 500 },
    },
    // Whole NPR. Cash the campaign needs from sponsors (not donations).
    fundingGoal: { type: Number, default: 0, min: 0 },
    resourceNeeds: [
      {
        type: { type: String, enum: RESOURCE_TYPES, default: 'OTHER' },
        description: { type: String, required: true, maxlength: 300 },
        quantity: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: '', maxlength: 30 },
      },
    ],
    // Copied onto a deal when it is agreed, then tracked per sponsor
    deliverablesTemplate: [
      {
        title: { type: String, required: true, maxlength: 200 },
        type: { type: String, enum: DELIVERABLE_TYPES, default: 'OTHER' },
        dueOffsetDays: { type: Number, default: 0 }, // days after the campaign ends; negative = before
      },
    ],
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    donationCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationCampaign', default: null },
    status: { type: String, enum: ['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'], default: 'DRAFT' },
    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Campaign visual identity: Hateymalo + approved sponsor logos on field kit
    brandKit: {
      campaignLabel: { type: String, default: '', maxlength: 60 },
      accentColor: { type: String, default: '#B5232C', match: /^#[0-9A-Fa-f]{6}$/ },
      slots: [
        {
          deal: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipDeal', required: true },
          order: { type: Number, default: 0 },
          size: { type: String, enum: ['XL', 'L', 'M', 'S'], default: 'M' },
          placements: [{ type: String, enum: BRAND_PLACEMENTS }],
        },
      ],
      notes: { type: String, default: '', maxlength: 1000 },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      approvedAt: { type: Date, default: null },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

opportunitySchema.index({ status: 1, startDate: 1 });

const SponsorshipOpportunity = mongoose.model('SponsorshipOpportunity', opportunitySchema);
module.exports = SponsorshipOpportunity;
module.exports.DELIVERABLE_TYPES = DELIVERABLE_TYPES;
module.exports.RESOURCE_TYPES = RESOURCE_TYPES;
module.exports.BRAND_PLACEMENTS = BRAND_PLACEMENTS;
