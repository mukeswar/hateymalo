const mongoose = require('mongoose');

// One advertiser campaign, owned by a SponsorAccount (the same organisation
// record used for sponsorship). Creatives are embedded; metrics live in
// AdMetricDaily counters, with running totals cached here for budget checks.
//
// status (stored):  DRAFT → IN_REVIEW → APPROVED ↔ PAUSED → ENDED → ARCHIVED
//                              ↘ REJECTED → (edit) → IN_REVIEW
// Whether an APPROVED campaign is actually serving right now is computed
// (see deliveryStatus in the controller): scheduled, live, finished or budget spent.
const STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED', 'ENDED', 'ARCHIVED'];
const PRICING_MODELS = ['FLAT', 'CPM', 'CPC'];
const OBJECTIVES = ['AWARENESS', 'TRAFFIC', 'VOLUNTEERS', 'DONATIONS', 'EVENT_PROMOTION', 'OTHER'];
const LABELS = ['Sponsored', 'Advertisement', 'Promoted', 'प्रायोजित'];
const CTAS = ['LEARN_MORE', 'VISIT', 'SIGN_UP', 'DONATE', 'VOLUNTEER', 'SHOP', 'CONTACT', 'WATCH'];

const creativeSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', maxlength: 120 },
    format: { type: String, enum: ['IMAGE', 'NATIVE', 'VIDEO'], required: true },
    imageUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    headline: { type: String, default: '', maxlength: 90 },
    body: { type: String, default: '', maxlength: 300 },
    cta: { type: String, enum: CTAS, default: 'LEARN_MORE' },
    altText: { type: String, default: '', maxlength: 200 },
    skipAfterSeconds: { type: Number, default: 5, min: 0, max: 30 },
    labelText: { type: String, enum: LABELS, default: 'Sponsored' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    rejectionReason: { type: String, default: '', maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES },
    note: { type: String, default: '', maxlength: 500 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const adCampaignSchema = new mongoose.Schema(
  {
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorAccount', required: true },
    title: { type: String, required: [true, 'Campaign title is required'], trim: true, maxlength: 140 },
    objective: { type: String, enum: OBJECTIVES, default: 'AWARENESS' },
    description: { type: String, default: '', maxlength: 2000 },
    destinationUrl: { type: String, required: [true, 'A destination link is required'] },
    appendUtm: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    // Whole NPR. FLAT: `flatPrice` for the whole run. CPM: `rate` per 1,000 impressions.
    // CPC: `rate` per click. `budget` caps CPM/CPC spend (0 = no cap for FLAT only).
    pricingModel: { type: String, enum: PRICING_MODELS, default: 'FLAT' },
    flatPrice: { type: Number, default: 0, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    budget: { type: Number, default: 0, min: 0 },
    // true when ad staff set flatPrice/rate by hand instead of the rate card
    customPrice: { type: Boolean, default: false },
    placements: { type: [{ type: String, lowercase: true, trim: true }], default: [] },
    surfaces: { type: [{ type: String, enum: ['WEB', 'APP'] }], default: ['WEB', 'APP'] },
    // Optional contextual targeting by cause name (posts store the category name;
    // empty = everywhere). Pages without a cause never show targeted campaigns.
    categories: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },
    // Per device per day, enforced by the client from its own on-device count (0 = none)
    frequencyCapPerDay: { type: Number, default: 3, min: 0, max: 50 },
    priority: { type: Number, default: 1, min: 1, max: 10 },
    creatives: { type: [creativeSchema], default: [] },
    status: { type: String, enum: STATUSES, default: 'DRAFT' },
    rejectionReason: { type: String, default: '', maxlength: 500 },
    // A pause by a reviewer can only be lifted by a reviewer, not by the advertiser
    pausedByStaff: { type: Boolean, default: false },
    pauseNote: { type: String, default: '', maxlength: 500 },
    history: { type: [historySchema], default: [] },
    submittedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    // Running valid-traffic totals (filtered traffic is only in AdMetricDaily)
    totals: {
      impressions: { type: Number, default: 0 },
      viewable: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

adCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
adCampaignSchema.index({ advertiser: 1, createdAt: -1 });

const AdCampaign = mongoose.model('AdCampaign', adCampaignSchema);
Object.assign(AdCampaign, { STATUSES, PRICING_MODELS, OBJECTIVES, LABELS, CTAS });
module.exports = AdCampaign;
