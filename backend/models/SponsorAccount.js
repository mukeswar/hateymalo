const mongoose = require('mongoose');

// A company, NGO, school, business or other organisation that sponsors
// Hateymalo campaigns. Any signed-in member can register one and becomes its
// OWNER; staff verify it. Every sponsor-side query is filtered by membership,
// so one organisation never sees another's deals or reports.
const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['OWNER', 'EDITOR', 'VIEWER'], default: 'EDITOR' },
  },
  { _id: false }
);

const sponsorAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Organisation name is required'], trim: true, maxlength: 140 },
    type: {
      type: String,
      enum: ['COMPANY', 'NGO', 'LOCAL_BUSINESS', 'EDUCATION', 'GOVERNMENT', 'MEDIA', 'INDIVIDUAL', 'OTHER'],
      default: 'COMPANY',
    },
    description: { type: String, default: '', maxlength: 2000 },
    website: { type: String, default: '' },
    panNumber: { type: String, default: '', trim: true, maxlength: 20 },
    vatRegistered: { type: Boolean, default: false },
    address: { type: String, default: '', maxlength: 300 },
    contactName: { type: String, default: '', maxlength: 120 },
    contactEmail: { type: String, default: '', lowercase: true, trim: true, maxlength: 160 },
    contactPhone: { type: String, default: '', maxlength: 40 },
    // Logo variants supplied by the sponsor (image URLs until media uploads are enabled)
    logos: [
      {
        label: { type: String, default: 'Primary', maxlength: 60 },
        url: { type: String, required: true },
        background: { type: String, enum: ['LIGHT', 'DARK', 'ANY'], default: 'ANY' },
      },
    ],
    members: { type: [memberSchema], default: [] },
    verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
    verificationNote: { type: String, default: '', maxlength: 500 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sponsorAccountSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('SponsorAccount', sponsorAccountSchema);
