import { AppState, Linking, Platform } from 'react-native';
import API, { API_URL } from '../../lib/api';
import { storage } from '../../lib/storage';

// Ad measurement for the app (docs/ADS.md "Rendering rules"):
// - events are queued and sent in batches (POST /ads/events, ≤ 50 per call),
//   every few seconds and whenever the app goes to the background;
// - each token reports each event type at most once from this device;
// - a per-device, per-day impression count per campaign enforces the
//   advertiser's frequency cap (campaigns over their cap go in `exclude`).
// Nothing personal is sent: the token identifies the ad, not the person.

const FLUSH_MS = 4000;
const MAX_BATCH = 50;
const FREQ_KEY = 'hm_ad_freq';

let queue = [];
const sent = new Set(); // `${token}:${type}` already queued from this device
let timer = null;
let appStateSub = null;

const today = () => {
  // Same calendar day as the server's reports (Nepal, UTC+5:45)
  const d = new Date(Date.now() + 345 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

const beacon = (events) => {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      return navigator.sendBeacon(`${API_URL}/ads/events`, JSON.stringify({ events }));
    }
  } catch { /* fall back to a normal request */ }
  return false;
};

export const flushAdEvents = async ({ useBeacon = false } = {}) => {
  while (queue.length) {
    const batch = queue.splice(0, MAX_BATCH);
    if (useBeacon && beacon(batch)) continue;
    try {
      await API.post('/ads/events', { events: batch });
    } catch {
      // Measurement is best effort: drop the batch rather than retry forever.
      return;
    }
  }
};

const ensureRunning = () => {
  if (!timer) timer = setInterval(() => { if (queue.length) flushAdEvents(); }, FLUSH_MS);
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flushAdEvents({ useBeacon: true });
    });
    // Web preview: a full page unload does not always change AppState first.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', () => flushAdEvents({ useBeacon: true }));
    }
  }
};

// Queue one event; duplicates for the same token are dropped here (the server dedupes too).
export const trackAdEvent = (token, type) => {
  if (!token || !type) return;
  const key = `${token}:${type}`;
  if (sent.has(key)) return;
  sent.add(key);
  queue.push({ t: token, type });
  ensureRunning();
  if (queue.length >= MAX_BATCH) flushAdEvents();
};

/* ---------------- frequency cap ---------------- */

const readFreq = async () => {
  try {
    const raw = await storage.get(FREQ_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && data.day === today() && data.counts && typeof data.counts === 'object') return data;
  } catch { /* corrupt or unavailable — start fresh */ }
  return { day: today(), counts: {} };
};

let freqWrite = Promise.resolve();

// Campaign ids that reached their frequencyCapPerDay on this device today.
export const cappedCampaigns = async () => {
  const { counts } = await readFreq();
  return Object.entries(counts)
    .filter(([, v]) => v && v.cap > 0 && v.n >= v.cap)
    .map(([id]) => id)
    .slice(0, 50);
};

export const countImpression = (campaignId, cap) => {
  if (!campaignId) return;
  freqWrite = freqWrite.then(async () => {
    const data = await readFreq();
    const prev = data.counts[campaignId] || { n: 0, cap: 0 };
    data.counts[campaignId] = { n: prev.n + 1, cap: Number(cap) || 0 };
    // Keep the stored value small (SecureStore values are size limited on device)
    const entries = Object.entries(data.counts).slice(-40);
    data.counts = Object.fromEntries(entries);
    try { await storage.set(FREQ_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  });
};

/* ---------------- click ---------------- */

// The click endpoint counts the click once and 302-redirects to the advertiser's site.
export const openAdClick = (ad) => {
  if (!ad?.clickPath) return;
  flushAdEvents();
  const url = `${API_URL}${ad.clickPath}`;
  Linking.openURL(url).catch(() => {});
};
