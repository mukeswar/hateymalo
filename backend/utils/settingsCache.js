const PlatformSettings = require('../models/PlatformSettings');

// Lightweight cached accessor for the single PlatformSettings document so that
// every controller enforcing a toggle (post approval, comments, donations, etc.)
// reads from the SAME source the Super Admin edits — no fake/duplicated flags.

let cache = null;
let cachedAt = 0;
const TTL_MS = 10000; // short TTL: admin changes take effect within ~10s

const getSettings = async () => {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  cache = settings;
  cachedAt = Date.now();
  return settings;
};

// Call after any settings write so the next read reflects it immediately.
const invalidateSettingsCache = () => {
  cache = null;
  cachedAt = 0;
};

module.exports = { getSettings, invalidateSettingsCache };
