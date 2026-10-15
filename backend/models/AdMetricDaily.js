const mongoose = require('mongoose');

// Ad counters, one document per campaign × creative × placement × surface ×
// day (Nepal time, YYYY-MM-DD). Counting into daily rows instead of storing
// each impression keeps the free Atlas tier from filling up. Traffic that must
// not be billed (bots, staff, duplicates, expired tokens) is kept in its own
// `filtered*` columns so the numbers can be audited.
const adMetricDailySchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign', required: true },
    creative: { type: mongoose.Schema.Types.ObjectId, required: true },
    placement: { type: String, required: true },
    surface: { type: String, enum: ['WEB', 'APP'], required: true },
    day: { type: String, required: true },
    served: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    viewable: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    videoStarts: { type: Number, default: 0 },
    videoQ25: { type: Number, default: 0 },
    videoQ50: { type: Number, default: 0 },
    videoQ75: { type: Number, default: 0 },
    videoComplete: { type: Number, default: 0 },
    videoSkips: { type: Number, default: 0 },
    filteredImpressions: { type: Number, default: 0 },
    filteredClicks: { type: Number, default: 0 },
  },
  { versionKey: false }
);

adMetricDailySchema.index({ campaign: 1, creative: 1, placement: 1, surface: 1, day: 1 }, { unique: true });
adMetricDailySchema.index({ day: 1 });

module.exports = mongoose.model('AdMetricDaily', adMetricDailySchema);
