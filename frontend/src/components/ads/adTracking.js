import API from '../../services/api';

/* --------------------------------------------------------------------------
   Ad serving + measurement helpers for <AdSlot>. Contract: docs/ADS.md
   ("Rendering rules"). Tokens identify the ad impression, never the person;
   nothing personal is ever sent.
   -------------------------------------------------------------------------- */

// Same base the axios instance uses; already ends in /api
export const API_BASE = String(API.defaults.baseURL || '/api').replace(/\/+$/, '');
export const clickUrl = (clickPath) => `${API_BASE}${clickPath}`;

/* ---------------------- per-device daily frequency cap ---------------------- */

const FREQ_KEY = 'hm_ad_freq';
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const readFreq = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(FREQ_KEY) || 'null');
    if (raw && raw.day === today() && raw.counts && typeof raw.counts === 'object') return raw;
  } catch {
    /* storage blocked or corrupt — behave as a fresh day */
  }
  return { day: today(), counts: {}, caps: {} };
};

const writeFreq = (f) => {
  try {
    localStorage.setItem(FREQ_KEY, JSON.stringify(f));
  } catch {
    /* private mode / quota — the cap simply is not enforced on this device */
  }
};

// Campaigns that reached their cap today on this device
export const cappedCampaigns = () => {
  const f = readFreq();
  return Object.keys(f.counts).filter((id) => {
    const cap = Number(f.caps?.[id]) || 0;
    return cap > 0 && f.counts[id] >= cap;
  });
};

export const countImpression = (campaignId, cap) => {
  const f = readFreq();
  const id = String(campaignId);
  f.counts[id] = (f.counts[id] || 0) + 1;
  f.caps = f.caps || {};
  f.caps[id] = Number(cap) || 0;
  writeFreq(f);
};

/* ------------------------------- serving ----------------------------------- */

// Campaigns currently on screen in this tab, so two slots on one page do not
// repeat the same advertiser. Requests run one after another for that reason.
const mounted = new Map(); // campaignId -> count
let serveChain = Promise.resolve();

export const markMounted = (campaignId) => {
  const id = String(campaignId);
  mounted.set(id, (mounted.get(id) || 0) + 1);
  return () => {
    const n = (mounted.get(id) || 1) - 1;
    if (n <= 0) mounted.delete(id);
    else mounted.set(id, n);
  };
};

export const serveAd = ({ placement, category, signal }) => {
  const run = async () => {
    if (signal?.aborted) return null;
    const exclude = [...new Set([...cappedCampaigns(), ...mounted.keys()])].slice(0, 50);
    const params = { placement, surface: 'WEB', limit: 1 };
    if (category) params.category = category;
    if (exclude.length) params.exclude = exclude.join(',');
    const res = await API.get('/ads/serve', { params, signal });
    const ad = res.data?.data?.ads?.[0] || null;
    if (!ad || signal?.aborted) return null;
    // Reserved right away so the next queued slot excludes it; the slot calls release() on unmount
    return { ad, placement: res.data.data.placement, release: markMounted(ad.campaignId) };
  };
  const p = serveChain.then(run, run);
  serveChain = p.catch(() => null);
  return p;
};

/* --------------------------- batched event queue --------------------------- */

const EVENTS_URL = `${API_BASE}/ads/events`;
let queue = [];
let timer = null;
let inFlight = Promise.resolve();

const send = (events, { beacon = false } = {}) => {
  const body = JSON.stringify({ events });
  if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      // Page is going away: text/plain avoids a CORS preflight; the endpoint parses the JSON string
      if (navigator.sendBeacon(EVENTS_URL, new Blob([body], { type: 'text/plain' }))) return Promise.resolve();
    } catch {
      /* fall through to fetch */
    }
  }
  // Regular flushes send JSON (parsed by the global JSON body parser)
  return fetch(EVENTS_URL, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
};

export const flushEvents = (opts = {}) => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return inFlight;
  // Server limit is 50 per call; order matters (IMPRESSION before VIEWABLE)
  const batches = [];
  while (queue.length) batches.push(queue.splice(0, 50));
  if (opts.beacon) {
    batches.forEach((b) => send(b, opts));
    return inFlight;
  }
  inFlight = inFlight.then(() => batches.reduce((p, b) => p.then(() => send(b)), Promise.resolve()));
  return inFlight;
};

export const trackEvent = (token, type) => {
  if (!token || !type) return;
  queue.push({ t: token, type });
  if (queue.length >= 20) flushEvents();
  else if (!timer) timer = setTimeout(() => flushEvents(), 3000);
};

if (typeof window !== 'undefined') {
  const onHide = () => flushEvents({ beacon: true });
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
}
