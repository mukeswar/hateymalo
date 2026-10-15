const mongoose = require('mongoose');

// De-duplication keys so one served ad counts at most one impression, one
// viewable impression, one click and one of each video quartile. `_id` is
// "<impression id>:<event type>". Rows expire after 26 hours, which is longer
// than an ad token stays valid, so the collection stays small.
const adEventSeenSchema = new mongoose.Schema(
  {
    _id: { type: String },
    at: { type: Date, default: Date.now, expires: 26 * 60 * 60 },
  },
  { versionKey: false }
);

module.exports = mongoose.model('AdEventSeen', adEventSeenSchema);
