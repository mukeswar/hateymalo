const mongoose = require('mongoose');

// An admin-managed ad slot. Clients render a slot by its `key` (for example
// `home.banner`) and only where their code has a matching slot, so a new key
// shows nothing until the web or app adds that slot. Ads are contextual: the
// slot and the page's cause, never a visitor profile.
const AD_FORMATS = ['IMAGE', 'NATIVE', 'VIDEO'];
const SURFACES = ['WEB', 'APP'];

const adPlacementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 60, match: /^[a-z0-9]+(\.[a-z0-9_-]+)+$/ },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    surfaces: { type: [{ type: String, enum: SURFACES }], default: ['WEB', 'APP'] },
    formats: { type: [{ type: String, enum: AD_FORMATS }], default: ['IMAGE', 'NATIVE'] },
    // Recommended creative size in pixels (guidance for advertisers, not enforced on URLs)
    width: { type: Number, default: 0, min: 0, max: 4000 },
    height: { type: Number, default: 0, min: 0, max: 4000 },
    maxAds: { type: Number, default: 1, min: 1, max: 5 },
    // Rate card shown to advertisers (whole NPR); 0 = not offered for that model
    rateCard: {
      flatPerDay: { type: Number, default: 0, min: 0 },
      cpm: { type: Number, default: 0, min: 0 },
      cpc: { type: Number, default: 0, min: 0 },
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Slots the web and app already render. Created on first use when the
// collection is empty; admins can then edit or deactivate them.
const DEFAULT_PLACEMENTS = [
  { key: 'home.banner', name: 'Home page banner', description: 'Wide banner below the homepage highlights.', formats: ['IMAGE', 'NATIVE'], width: 1200, height: 300, maxAds: 1, order: 1 },
  { key: 'feed.inline', name: 'In-feed sponsored card', description: 'A card mixed into the help-request and story lists, after every few items.', formats: ['NATIVE', 'IMAGE', 'VIDEO'], width: 1080, height: 1080, maxAds: 2, order: 2 },
  { key: 'content.footer', name: 'Below posts, stories and events', description: 'Shown under the main content of a post, story or event page.', formats: ['IMAGE', 'NATIVE', 'VIDEO'], width: 1200, height: 628, maxAds: 1, order: 3 },
  { key: 'events.list', name: 'Events list', description: 'Card at the top of the events list.', formats: ['NATIVE', 'IMAGE'], width: 1200, height: 628, maxAds: 1, order: 4 },
];

adPlacementSchema.statics.ensureDefaults = async function ensureDefaults() {
  if ((await this.estimatedDocumentCount()) > 0) return;
  try {
    await this.insertMany(DEFAULT_PLACEMENTS, { ordered: false });
  } catch {
    /* another instance inserted them first */
  }
};

const AdPlacement = mongoose.model('AdPlacement', adPlacementSchema);
AdPlacement.AD_FORMATS = AD_FORMATS;
AdPlacement.SURFACES = SURFACES;
AdPlacement.DEFAULT_PLACEMENTS = DEFAULT_PLACEMENTS;
module.exports = AdPlacement;
