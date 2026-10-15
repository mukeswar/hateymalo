const mongoose = require('mongoose');
const AdCampaign = require('../models/AdCampaign');
const AdPlacement = require('../models/AdPlacement');
const AdMetricDaily = require('../models/AdMetricDaily');
const AdEventSeen = require('../models/AdEventSeen');
const SponsorAccount = require('../models/SponsorAccount');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { hasPermission } = require('../utils/permissions');
const { isStaff } = require('../utils/roles');
const { createAuditLog } = require('../utils/auditLogger');
const { getSettings } = require('../utils/settingsCache');
const { issueAdToken, readAdToken } = require('../utils/adToken');
const { spendOf, bookedValueOf, budgetSpent } = require('../utils/adMoney');
const { syncCampaignContracted } = require('../utils/ledger');

const { PRICING_MODELS, OBJECTIVES, LABELS, CTAS } = AdCampaign;
const { AD_FORMATS, SURFACES } = AdPlacement;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isId = (v) => mongoose.isValidObjectId(v);
const sameId = (a, b) => !!a && !!b && String(a._id || a) === String(b._id || b);
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim()) && v.length <= 2000;
const optUrl = (v) => (!v ? '' : isHttpUrl(v) ? v.trim() : null);
const optDate = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);
const DAY_MS = 24 * 60 * 60 * 1000;

// Calendar day in Nepal (UTC+5:45) — reports are read by people in Nepal
const nepalDay = (d = new Date()) => new Date(d.getTime() + 345 * 60 * 1000).toISOString().slice(0, 10);

const canManageAds = (u) => hasPermission(u, 'canManageAds');
const canReviewAds = (u) => hasPermission(u, 'canReviewAds');
const canAdFinance = (u) => hasPermission(u, 'canManageSponsorFinance');
const isAdStaff = (u) => canManageAds(u) || canReviewAds(u) || canAdFinance(u);

const memberRole = (account, u) => {
  if (!u || !account) return null;
  const m = (account.members || []).find((x) => sameId(x.user, u._id));
  return m ? m.role : null;
};

const audit = (req, action, targetId = null, details = '') =>
  createAuditLog({ adminUser: req.user, action, targetType: 'AD', targetId, details, req });

const notifyUsers = async (userIds, senderId, title, message, link) => {
  const ids = [...new Set(userIds.map(String))].filter((id) => id !== String(senderId));
  if (!ids.length) return;
  await Notification.insertMany(ids.map((recipient) => ({ recipient, sender: senderId, type: 'ADVERTISING', title, message, link })));
};
const notifyAdvertiser = async (accountId, senderId, title, message, link) => {
  const acc = await SponsorAccount.findById(accountId).select('members');
  if (acc) await notifyUsers(acc.members.map((m) => m.user), senderId, title, message, link);
};
const notifyReviewers = async (senderId, title, message, link) => {
  const staff = await User.find({ role: { $in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] } }).select('role permissions');
  await notifyUsers(staff.filter((s) => canReviewAds(s)).map((s) => s._id), senderId, title, message, link);
};

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|curl|wget|python-requests|axios|node-fetch|postman|monitor/i;
const isBot = (req) => {
  const ua = req.headers['user-agent'] || '';
  // The Hateymalo app identifies itself; native HTTP clients may send no User-Agent
  const fromApp = req.headers['x-hateymalo-client'] === 'app';
  return (!ua && !fromApp) || (BOT_UA.test(ua) && !(fromApp && /axios|okhttp/i.test(ua) && !/bot|crawl|spider/i.test(ua))) || req.headers.purpose === 'prefetch' || req.headers['sec-purpose']?.includes('prefetch');
};

// Lazily close campaigns whose end date has passed (no scheduled jobs on Vercel).
let lastSweep = 0;
const sweepEnded = async () => {
  if (Date.now() - lastSweep < 60 * 1000) return;
  lastSweep = Date.now();
  const now = new Date();
  const ended = await AdCampaign.find({ status: { $in: ['APPROVED', 'PAUSED'] }, endDate: { $lt: now } }).select('_id');
  if (ended.length) {
    await AdCampaign.updateMany(
      { _id: { $in: ended.map((e) => e._id) } },
      { $set: { status: 'ENDED', pausedByStaff: false }, $push: { history: { status: 'ENDED', note: 'End date reached', at: now } } }
    );
  }
};

/* ---------------------------- money ------------------------------- */


// Whole days between start and end (a 1 Oct → 11 Oct booking is 10 days)
const campaignDays = (start, end) => Math.max(1, Math.round((new Date(end) - new Date(start)) / DAY_MS));

// Price an advertiser's request from the placements' rate cards (staff can override)
const quoteFromRateCard = (pricingModel, placements, start, end) => {
  if (!placements.length) return { ok: false, message: 'Choose at least one placement' };
  if (pricingModel === 'FLAT') {
    const perDay = placements.reduce((s, p) => s + (p.rateCard?.flatPerDay || 0), 0);
    if (placements.some((p) => !p.rateCard?.flatPerDay)) return { ok: false, message: 'A chosen placement is not sold at a flat price. Choose CPM/CPC or contact our team for a quote.' };
    return { ok: true, flatPrice: perDay * campaignDays(start, end), rate: 0 };
  }
  const key = pricingModel === 'CPM' ? 'cpm' : 'cpc';
  if (placements.some((p) => !p.rateCard?.[key])) return { ok: false, message: `A chosen placement is not sold by ${pricingModel}. Choose another pricing model or contact our team.` };
  return { ok: true, flatPrice: 0, rate: Math.max(...placements.map((p) => p.rateCard[key])) };
};

/* --------------------------- shaping ------------------------------ */

const deliveryStatus = (c) => {
  if (c.status !== 'APPROVED') return c.status;
  const now = new Date();
  if (new Date(c.startDate) > now) return 'SCHEDULED';
  if (new Date(c.endDate) < now) return 'FINISHED';
  if (budgetSpent(c)) return 'BUDGET_SPENT';
  if (!(c.creatives || []).some((k) => k.status === 'APPROVED' && k.isActive)) return 'NO_CREATIVE';
  return 'LIVE';
};

const viewerOf = (c, u, account) => {
  const role = memberRole(account || c.advertiser, u);
  return {
    isAdvertiser: !!role,
    advertiserRole: role,
    canEdit: (['OWNER', 'EDITOR'].includes(role) || canManageAds(u)) && !['ENDED', 'ARCHIVED'].includes(c.status),
    canReview: canReviewAds(u),
    canManage: canManageAds(u),
    isFinance: canAdFinance(u),
  };
};

const shapeCampaign = (doc, u, { withHistory = true } = {}) => {
  const c = doc.toObject ? doc.toObject() : doc;
  const out = {
    ...c,
    deliveryStatus: deliveryStatus(c),
    spend: spendOf(c),
    bookedValue: bookedValueOf(c),
    ctr: c.totals?.impressions ? +((c.totals.clicks / c.totals.impressions) * 100).toFixed(2) : 0,
    viewer: viewerOf(c, u),
  };
  if (c.advertiser && c.advertiser.members) {
    out.advertiser = { _id: c.advertiser._id, name: c.advertiser.name, type: c.advertiser.type, verificationStatus: c.advertiser.verificationStatus, logos: c.advertiser.logos };
  }
  if (!withHistory) delete out.history;
  return out;
};

const loadCampaign = (id) => AdCampaign.findById(id).populate('advertiser', 'name type verificationStatus logos members');

// Who may read a campaign: advertiser members or ad staff
const canRead = (c, u) => !!memberRole(c.advertiser, u) || isAdStaff(u);
// Who may change content: advertiser OWNER/EDITOR or ad managers
const canWrite = (c, u) => ['OWNER', 'EDITOR'].includes(memberRole(c.advertiser, u)) || canManageAds(u);

/* --------------------------- parsing ------------------------------ */

const CONTENT_KEYS = ['format', 'imageUrl', 'videoUrl', 'posterUrl', 'headline', 'body', 'cta', 'altText', 'skipAfterSeconds', 'labelText'];

const parseCreatives = (arr, existing = []) => {
  const errors = [];
  if (!Array.isArray(arr)) return { creatives: undefined, errors };
  if (arr.length > 10) errors.push('A campaign can have at most 10 creatives');
  const creatives = arr.slice(0, 10).map((r, idx) => {
    const n = `Creative ${idx + 1}`;
    const k = {
      ...(isId(r?._id) ? { _id: r._id } : {}),
      name: str(r?.name, 120) || n,
      format: pick(r?.format, AD_FORMATS, null),
      imageUrl: optUrl(r?.imageUrl),
      videoUrl: optUrl(r?.videoUrl),
      posterUrl: optUrl(r?.posterUrl),
      headline: str(r?.headline, 90),
      body: str(r?.body, 300),
      cta: pick(r?.cta, CTAS, 'LEARN_MORE'),
      altText: str(r?.altText, 200),
      skipAfterSeconds: Math.min(30, int(r?.skipAfterSeconds ?? 5)),
      labelText: pick(r?.labelText, LABELS, 'Sponsored'),
      isActive: r?.isActive !== false,
    };
    if (!k.format) errors.push(`${n}: choose a format (${AD_FORMATS.join(', ')})`);
    for (const f of ['imageUrl', 'videoUrl', 'posterUrl']) if (k[f] === null) errors.push(`${n}: ${f} must be an http(s) link`);
    if (k.format === 'IMAGE' && !k.imageUrl) errors.push(`${n}: an image link is required`);
    if (k.format === 'NATIVE' && (!k.headline || !k.imageUrl)) errors.push(`${n}: a sponsored card needs a headline and an image`);
    if (k.format === 'VIDEO' && !k.videoUrl) errors.push(`${n}: a video link is required`);
    if (k.format !== 'NATIVE' && k.imageUrl && !k.altText) k.altText = k.headline || '';
    // Keep the review decision only when the ad content itself is unchanged
    const prev = k._id ? existing.find((e) => sameId(e._id, k._id)) : null;
    if (prev && CONTENT_KEYS.every((key) => String(prev[key] ?? '') === String(k[key] ?? ''))) {
      k.status = prev.status;
      k.rejectionReason = prev.rejectionReason;
    } else {
      k.status = 'PENDING';
      k.rejectionReason = '';
    }
    return k;
  });
  return { creatives, errors };
};

// Fields an advertiser or manager may set. Pricing is handled separately.
const parseCampaignBody = (b) => {
  const out = {};
  const errors = [];
  if (b.title !== undefined) out.title = str(b.title, 140);
  if (b.objective !== undefined) out.objective = pick(b.objective, OBJECTIVES, 'AWARENESS');
  if (b.description !== undefined) out.description = str(b.description, 2000);
  if (b.destinationUrl !== undefined) {
    if (!isHttpUrl(b.destinationUrl)) errors.push('The destination must be an http(s) link');
    else out.destinationUrl = b.destinationUrl.trim();
  }
  if (b.appendUtm !== undefined) out.appendUtm = !!b.appendUtm;
  for (const k of ['startDate', 'endDate']) {
    if (b[k] !== undefined) {
      const d = optDate(b[k]);
      if (!d) errors.push(`${k === 'startDate' ? 'Start' : 'End'} date is required`);
      else out[k] = d;
    }
  }
  if (b.pricingModel !== undefined) out.pricingModel = pick(b.pricingModel, PRICING_MODELS, 'FLAT');
  if (b.budget !== undefined) out.budget = int(b.budget);
  if (b.placements !== undefined) out.placements = Array.isArray(b.placements) ? [...new Set(b.placements.map((p) => str(p, 60).toLowerCase()).filter(Boolean))].slice(0, 20) : [];
  if (b.surfaces !== undefined) {
    out.surfaces = Array.isArray(b.surfaces) ? [...new Set(b.surfaces.filter((s) => SURFACES.includes(s)))] : [];
    if (!out.surfaces.length) errors.push('Choose the website, the app, or both');
  }
  if (b.categories !== undefined) out.categories = Array.isArray(b.categories) ? [...new Set(b.categories.map((s) => str(s, 80)).filter(Boolean))].slice(0, 20) : [];
  if (b.frequencyCapPerDay !== undefined) out.frequencyCapPerDay = Math.min(50, int(b.frequencyCapPerDay));
  return { out, errors };
};

const PRICING_INPUTS = ['pricingModel', 'placements', 'startDate', 'endDate'];
// Campaign fields a reviewer signs off on (frequency cap can change freely)
const REVIEWED_FIELDS = ['title', 'objective', 'description', 'destinationUrl', 'appendUtm', 'startDate', 'endDate', 'pricingModel', 'budget', 'placements', 'surfaces', 'categories'];
const snapshot = (doc, keys) => JSON.stringify(keys.map((k) => (Array.isArray(doc[k]) ? [...doc[k]].map(String).sort() : doc[k] instanceof Date ? doc[k].getTime() : doc[k] ?? null)));

// Validates dates/placements and sets the price. Staff with canManageAds may
// set `flatPrice` / `rate` directly (a custom price). A custom price survives
// advertiser edits that leave model, placements and dates alone; otherwise the
// advertiser gets the rate-card quote.
const applyPricing = async (doc, body, user, { inputsChanged = true } = {}) => {
  if (doc.endDate <= doc.startDate) return 'The end date must be after the start date';
  if (campaignDays(doc.startDate, doc.endDate) > 366) return 'A campaign can run for at most one year';
  const placements = await AdPlacement.find({ key: { $in: doc.placements }, isActive: true });
  if (placements.length !== doc.placements.length) return 'One of the chosen placements does not exist or is no longer offered';
  const staffPrice = canManageAds(user) && (body.flatPrice !== undefined || body.rate !== undefined);
  if (staffPrice) {
    if (body.flatPrice !== undefined) doc.flatPrice = int(body.flatPrice);
    if (body.rate !== undefined) doc.rate = int(body.rate);
    doc.customPrice = true;
  } else if (doc.customPrice && (canManageAds(user) || !inputsChanged)) {
    /* keep the negotiated price */
  } else {
    doc.customPrice = false;
    const q = quoteFromRateCard(doc.pricingModel, placements, doc.startDate, doc.endDate);
    if (!q.ok) return q.message;
    doc.flatPrice = q.flatPrice;
    doc.rate = q.rate;
  }
  if (doc.pricingModel !== 'FLAT') {
    doc.flatPrice = 0;
    if (!doc.budget) return 'Set a total budget for CPM or CPC pricing';
    if (!doc.rate) return 'Set a rate for CPM or CPC pricing';
  } else {
    doc.rate = 0;
    doc.budget = 0;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Public: placements, serving, tracking                               */
/* ------------------------------------------------------------------ */

// GET /api/ads/placements  — active slots with their rate cards
const listPlacements = async (req, res) => {
  try {
    await AdPlacement.ensureDefaults();
    const data = await AdPlacement.find({ isActive: true }).sort({ order: 1, name: 1 });
    res.json({ success: true, data });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const ctaLabel = { LEARN_MORE: 'Learn more', VISIT: 'Visit', SIGN_UP: 'Sign up', DONATE: 'Donate', VOLUNTEER: 'Volunteer', SHOP: 'Shop now', CONTACT: 'Contact us', WATCH: 'Watch' };

const weightedShuffle = (items) =>
  items
    .map((c) => ({ c, w: Math.random() ** (1 / (c.priority || 1)) }))
    .sort((a, b) => b.w - a.w)
    .map((x) => x.c);

// GET /api/ads/serve?placement=home.banner&surface=WEB|APP&category=<cause name>&limit=1&exclude=<campaignId,…>
const serveAds = async (req, res) => {
  try {
    const empty = (placement = null) => res.json({ success: true, data: { placement, ads: [] } });
    res.set('Cache-Control', 'no-store');
    const settings = await getSettings();
    if (settings.adsEnabled === false) return empty();
    const key = str(req.query.placement, 60).toLowerCase();
    const surface = pick(String(req.query.surface || '').toUpperCase(), SURFACES, 'WEB');
    await AdPlacement.ensureDefaults();
    const placement = await AdPlacement.findOne({ key, isActive: true });
    if (!placement || !placement.surfaces.includes(surface)) return empty();
    const pInfo = { key: placement.key, maxAds: placement.maxAds, width: placement.width, height: placement.height };

    const now = new Date();
    const category = str(req.query.category, 80);
    const exclude = String(req.query.exclude || '').split(',').filter(isId).slice(0, 50);
    const limit = Math.max(1, Math.min(placement.maxAds, int(req.query.limit) || placement.maxAds));
    const query = {
      status: 'APPROVED',
      startDate: { $lte: now },
      endDate: { $gte: now },
      placements: key,
      surfaces: surface,
      creatives: { $elemMatch: { status: 'APPROVED', isActive: true, format: { $in: placement.formats } } },
      ...(exclude.length ? { _id: { $nin: exclude } } : {}),
      ...(category
        ? { $or: [{ categories: { $size: 0 } }, { categories: { $regex: `^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] }
        : { categories: { $size: 0 } }),
    };
    const candidates = (await AdCampaign.find(query).populate('advertiser', 'name verificationStatus').limit(100)).filter(
      (c) => !budgetSpent(c) && c.advertiser?.verificationStatus === 'VERIFIED'
    );
    const filtered = isBot(req) || isStaff(req.user);
    const chosen = weightedShuffle(candidates).slice(0, limit);
    const day = nepalDay();
    const ads = chosen.map((c) => {
      const pool = c.creatives.filter((k) => k.status === 'APPROVED' && k.isActive && placement.formats.includes(k.format));
      const k = pool[Math.floor(Math.random() * pool.length)];
      const token = issueAdToken({ campaign: c._id, creative: k._id, placement: key, surface, filtered });
      AdMetricDaily.updateOne({ campaign: c._id, creative: k._id, placement: key, surface, day }, { $inc: { served: 1 } }, { upsert: true }).catch(() => {});
      return {
        token,
        campaignId: c._id,
        creativeId: k._id,
        format: k.format,
        imageUrl: k.imageUrl,
        videoUrl: k.videoUrl,
        posterUrl: k.posterUrl,
        headline: k.headline,
        body: k.body,
        cta: k.cta,
        ctaLabel: ctaLabel[k.cta] || 'Learn more',
        altText: k.altText,
        labelText: k.labelText,
        skipAfterSeconds: k.skipAfterSeconds,
        advertiserName: c.advertiser?.name || '',
        frequencyCapPerDay: c.frequencyCapPerDay,
        clickPath: `/ads/click?t=${encodeURIComponent(token)}`,
      };
    });
    res.json({ success: true, data: { placement: pInfo, ads } });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const EVENT_FIELDS = {
  IMPRESSION: 'impressions',
  VIEWABLE: 'viewable',
  VIDEO_START: 'videoStarts',
  VIDEO_Q25: 'videoQ25',
  VIDEO_Q50: 'videoQ50',
  VIDEO_Q75: 'videoQ75',
  VIDEO_COMPLETE: 'videoComplete',
  VIDEO_SKIP: 'videoSkips',
};

// First time this impression reports this event? (atomic via unique _id)
const firstSeen = async (impressionId, type) => {
  try {
    await AdEventSeen.create({ _id: `${impressionId}:${type}` });
    return true;
  } catch (e) {
    if (e.code === 11000) return false;
    throw e;
  }
};

// Applies one tracked event; returns true when it was counted as valid traffic.
const recordEvent = async (payload, type, { expired, bot }) => {
  if (!isId(payload.c) || !isId(payload.k)) return false;
  const surface = pick(payload.s, SURFACES, 'WEB');
  const fresh = await firstSeen(payload.i, type);
  // Duplicates are dropped silently (a re-render is not a new impression)
  if (!fresh) return false;
  const filtered = expired || bot || payload.f === 1;
  const field = type === 'CLICK' ? 'clicks' : EVENT_FIELDS[type];
  const inc = {};
  if (filtered) {
    if (type === 'IMPRESSION') inc.filteredImpressions = 1;
    else if (type === 'CLICK') inc.filteredClicks = 1;
    else return false;
  } else {
    inc[field] = 1;
  }
  await AdMetricDaily.updateOne({ campaign: payload.c, creative: payload.k, placement: str(payload.p, 60), surface, day: nepalDay() }, { $inc: inc }, { upsert: true });
  if (!filtered && ['IMPRESSION', 'VIEWABLE', 'CLICK'].includes(type)) {
    await AdCampaign.updateOne({ _id: payload.c }, { $inc: { [`totals.${type === 'IMPRESSION' ? 'impressions' : type === 'VIEWABLE' ? 'viewable' : 'clicks'}`]: 1 } });
  }
  return !filtered;
};

// POST /api/ads/events  { events: [{ t: token, type }] }  — up to 50 per call
const trackEvents = async (req, res) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
    const bot = isBot(req) || isStaff(req.user);
    let counted = 0;
    let ignored = 0;
    for (const ev of events) {
      const type = String(ev?.type || '').toUpperCase();
      const tok = readAdToken(ev?.t);
      if (!tok || !EVENT_FIELDS[type]) {
        ignored += 1;
        continue;
      }
      // A viewable impression or video event only counts after the impression itself
      if (type !== 'IMPRESSION' && !(await AdEventSeen.exists({ _id: `${tok.payload.i}:IMPRESSION` }))) {
        ignored += 1;
        continue;
      }
      if (await recordEvent(tok.payload, type, { expired: tok.expired, bot })) counted += 1;
      else ignored += 1;
    }
    res.json({ success: true, data: { counted, ignored } });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const withUtm = (url, campaign) => {
  if (!campaign.appendUtm) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'hateymalo');
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'sponsored');
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', String(campaign._id));
    return u.toString();
  } catch {
    return url;
  }
};

// GET /api/ads/click?t=<token>  — counts one click per impression, then redirects
const clickAd = async (req, res) => {
  try {
    const home = process.env.CLIENT_URL || '/';
    const tok = readAdToken(req.query.t);
    if (!tok || !isId(tok.payload.c)) return res.redirect(302, home);
    const campaign = await AdCampaign.findById(tok.payload.c).select('destinationUrl appendUtm');
    if (!campaign || !isHttpUrl(campaign.destinationUrl)) return res.redirect(302, home);
    await recordEvent(tok.payload, 'CLICK', { expired: tok.expired, bot: isBot(req) || isStaff(req.user) }).catch(() => {});
    res.set('Cache-Control', 'no-store');
    res.redirect(302, withUtm(campaign.destinationUrl, campaign));
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Advertiser + manager: campaigns                                     */
/* ------------------------------------------------------------------ */

// POST /api/ads/campaigns
const createCampaign = async (req, res) => {
  try {
    const b = req.body || {};
    if (!isId(b.advertiser)) return fail(res, 400, 'Choose which sponsor account this campaign is for');
    const account = await SponsorAccount.findById(b.advertiser);
    if (!account) return fail(res, 404, 'Sponsor account not found');
    const role = memberRole(account, req.user);
    if (!['OWNER', 'EDITOR'].includes(role) && !canManageAds(req.user)) return fail(res, 403, 'Only owners and editors of this account can create ad campaigns');
    if (account.verificationStatus === 'REJECTED') return fail(res, 400, 'This sponsor account was not verified, so it cannot advertise');
    if (!canManageAds(req.user) && (await AdCampaign.countDocuments({ advertiser: account._id, status: { $in: ['DRAFT', 'IN_REVIEW'] } })) >= 20) {
      return fail(res, 400, 'This account already has 20 campaigns waiting as drafts or in review');
    }

    const { out, errors } = parseCampaignBody(b);
    const { creatives, errors: cErrors } = parseCreatives(b.creatives || []);
    const all = [...errors, ...cErrors];
    if (all.length) return fail(res, 400, all[0]);
    if (!out.title) return fail(res, 400, 'Campaign title is required');
    if (!out.destinationUrl) return fail(res, 400, 'A destination link is required');
    if (!out.startDate || !out.endDate) return fail(res, 400, 'Start and end dates are required');

    const doc = new AdCampaign({
      pricingModel: 'FLAT',
      placements: [],
      ...out,
      advertiser: account._id,
      creatives,
      createdBy: req.user._id,
      history: [{ status: 'DRAFT', note: 'Created', by: req.user._id }],
    });
    if (doc.placements.length) {
      const err = await applyPricing(doc, b, req.user);
      if (err) return fail(res, 400, err);
    }
    await doc.save();
    if (!role) audit(req, `Created ad campaign "${doc.title}" for ${account.name}`, doc._id);
    const fresh = await loadCampaign(doc._id);
    res.status(201).json({ success: true, message: 'Campaign saved as a draft', data: shapeCampaign(fresh, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/ads/campaigns/mine?advertiser=<id>
const myCampaigns = async (req, res) => {
  try {
    await sweepEnded();
    const accounts = await SponsorAccount.find({ 'members.user': req.user._id }).select('_id');
    let ids = accounts.map((a) => String(a._id));
    if (req.query.advertiser) ids = ids.filter((id) => id === String(req.query.advertiser));
    const list = await AdCampaign.find({ advertiser: { $in: ids } })
      .populate('advertiser', 'name type verificationStatus logos members')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, data: list.map((c) => shapeCampaign(c, req.user, { withHistory: false })) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/ads/campaigns/:id
const getCampaign = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    await sweepEnded();
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (!canRead(c, req.user)) return fail(res, 403, 'You do not have access to this campaign');
    await c.populate('history.by', 'name');
    res.json({ success: true, data: shapeCampaign(c, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/ads/campaigns/:id
const updateCampaign = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (!canWrite(c, req.user)) return fail(res, 403, 'Only owners and editors of this account can change the campaign');
    if (['ENDED', 'ARCHIVED'].includes(c.status)) return fail(res, 400, 'Ended campaigns cannot be changed');

    const b = req.body || {};
    const { out, errors } = parseCampaignBody(b);
    const { creatives, errors: cErrors } = parseCreatives(b.creatives, c.creatives);
    const all = [...errors, ...cErrors];
    if (all.length) return fail(res, 400, all[0]);
    if (out.title === '') return fail(res, 400, 'Campaign title is required');

    const beforePrice = `${c.pricingModel}|${c.flatPrice}|${c.rate}|${c.budget}`;
    const beforeInputs = snapshot(c, PRICING_INPUTS);
    const beforeContent = snapshot(c, REVIEWED_FIELDS);
    Object.assign(c, out);
    if (creatives) c.creatives = creatives;
    if (c.placements.length) {
      const err = await applyPricing(c, b, req.user, { inputsChanged: beforeInputs !== snapshot(c, PRICING_INPUTS) });
      if (err) return fail(res, 400, err);
    }

    // Changes by anyone who cannot approve ads send a live campaign back to review
    const wasLive = ['APPROVED', 'PAUSED'].includes(c.status);
    const pendingCreative = (c.creatives || []).some((k) => k.status === 'PENDING' && k.isActive);
    const priceChanged = beforePrice !== `${c.pricingModel}|${c.flatPrice}|${c.rate}|${c.budget}`;
    const backToReview = wasLive && !canReviewAds(req.user) && (beforeContent !== snapshot(c, REVIEWED_FIELDS) || priceChanged || pendingCreative);
    if (backToReview) {
      c.status = 'IN_REVIEW';
      c.submittedAt = new Date();
      c.pausedByStaff = false;
      c.history.push({ status: 'IN_REVIEW', note: 'Changed after approval — waiting for review again', by: req.user._id });
    }
    await c.save();
    await syncCampaignContracted(c, req.user);
    if (!memberRole(c.advertiser, req.user)) audit(req, `Updated ad campaign "${c.title}"${priceChanged ? ' (pricing changed)' : ''}`, c._id);
    if (backToReview) notifyReviewers(req.user._id, 'Ad changed — review again', `"${c.title}" by ${c.advertiser.name} was changed after approval.`, `/admin?tab=ads&campaign=${c._id}`).catch(() => {});
    const fresh = await loadCampaign(c._id);
    res.json({ success: true, message: backToReview ? 'Saved. The campaign is paused until our team reviews the changes.' : 'Campaign saved', data: shapeCampaign(fresh, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/ads/campaigns/:id/submit  — DRAFT/REJECTED → IN_REVIEW
const submitCampaign = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (!canWrite(c, req.user)) return fail(res, 403, 'Only owners and editors of this account can submit the campaign');
    if (!['DRAFT', 'REJECTED'].includes(c.status)) return fail(res, 400, `A campaign that is ${c.status.toLowerCase().replace('_', ' ')} cannot be submitted`);
    if (!c.placements.length) return fail(res, 400, 'Choose at least one placement before submitting');
    if (!c.creatives.some((k) => k.isActive)) return fail(res, 400, 'Add at least one creative before submitting');
    if (c.endDate < new Date()) return fail(res, 400, 'The end date has already passed — choose new dates');
    // Re-check dates and placements and refresh a rate-card quote (a custom price is kept)
    const err = await applyPricing(c, {}, req.user, { inputsChanged: false });
    if (err) return fail(res, 400, err);
    c.status = 'IN_REVIEW';
    c.submittedAt = new Date();
    c.rejectionReason = '';
    c.history.push({ status: 'IN_REVIEW', note: str(req.body?.note, 500) || 'Submitted for review', by: req.user._id });
    await c.save();
    notifyReviewers(req.user._id, 'New ad to review', `"${c.title}" by ${c.advertiser.name} is waiting for review.`, `/admin?tab=ads&campaign=${c._id}`).catch(() => {});
    const fresh = await loadCampaign(c._id);
    res.json({ success: true, message: 'Submitted. Our team usually reviews ads within two working days.', data: shapeCampaign(fresh, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/ads/campaigns/:id/status  { action: PAUSE|RESUME|END|ARCHIVE|WITHDRAW, note }
const changeCampaignStatus = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    const action = String(req.body?.action || '').toUpperCase();
    const note = str(req.body?.note, 500);
    const reviewer = canReviewAds(req.user);
    const writer = canWrite(c, req.user);
    if (!reviewer && !writer) return fail(res, 403, 'You cannot change this campaign');

    const moves = {
      PAUSE: { from: ['APPROVED'], to: 'PAUSED' },
      RESUME: { from: ['PAUSED'], to: 'APPROVED' },
      END: { from: ['APPROVED', 'PAUSED'], to: 'ENDED' },
      ARCHIVE: { from: ['DRAFT', 'REJECTED', 'ENDED'], to: 'ARCHIVED' },
      WITHDRAW: { from: ['IN_REVIEW'], to: 'DRAFT' },
    };
    const move = moves[action];
    if (!move) return fail(res, 400, 'Unknown action');
    if (!move.from.includes(c.status)) return fail(res, 400, `Cannot ${action.toLowerCase()} a campaign that is ${c.status.toLowerCase().replace('_', ' ')}`);
    if (action === 'RESUME' && c.pausedByStaff && !reviewer) return fail(res, 403, 'Our team paused this campaign. Message us to have it resumed.');
    if (action === 'RESUME' && c.endDate < new Date()) return fail(res, 400, 'The end date has passed');

    const byStaff = reviewer && !memberRole(c.advertiser, req.user);
    c.status = move.to;
    if (action === 'PAUSE') {
      c.pausedByStaff = byStaff;
      c.pauseNote = note;
    }
    if (action === 'RESUME') {
      c.pausedByStaff = false;
      c.pauseNote = '';
    }
    const done = { PAUSE: 'Paused', RESUME: 'Resumed', END: 'Ended', ARCHIVE: 'Archived', WITHDRAW: 'Withdrawn from review' }[action];
    c.history.push({ status: move.to, note: note || done, by: req.user._id });
    await c.save();
    await syncCampaignContracted(c, req.user);
    if (byStaff) {
      audit(req, `${done} ad campaign "${c.title}"`, c._id, note);
      notifyAdvertiser(c.advertiser._id, req.user._id, `Ad campaign ${move.to.toLowerCase()}`, `Our team set "${c.title}" to ${move.to.toLowerCase()}.${note ? ` ${note}` : ''}`, `/sponsor/ads/${c._id}`).catch(() => {});
    }
    const fresh = await loadCampaign(c._id);
    res.json({ success: true, message: `Campaign ${move.to.toLowerCase()}`, data: shapeCampaign(fresh, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/ads/campaigns/:id  — drafts that never served
const deleteCampaign = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (!canWrite(c, req.user)) return fail(res, 403, 'You cannot delete this campaign');
    if (!['DRAFT', 'REJECTED'].includes(c.status) || (await AdMetricDaily.exists({ campaign: c._id }))) {
      return fail(res, 409, 'Only drafts that never ran can be deleted. Archive it instead.');
    }
    await c.deleteOne();
    if (!memberRole(c.advertiser, req.user)) audit(req, `Deleted ad campaign "${c.title}"`, c._id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

const METRIC_KEYS = ['served', 'impressions', 'viewable', 'clicks', 'videoStarts', 'videoQ25', 'videoQ50', 'videoQ75', 'videoComplete', 'videoSkips', 'filteredImpressions', 'filteredClicks'];
const emptyRow = () => Object.fromEntries(METRIC_KEYS.map((k) => [k, 0]));
const addRow = (a, b) => METRIC_KEYS.forEach((k) => (a[k] += b[k] || 0));
const rates = (r) => ({
  ctr: r.impressions ? +((r.clicks / r.impressions) * 100).toFixed(2) : 0,
  viewableRate: r.impressions ? +((r.viewable / r.impressions) * 100).toFixed(1) : 0,
  completionRate: r.videoStarts ? +((r.videoComplete / r.videoStarts) * 100).toFixed(1) : 0,
});
const spendForRow = (c, r) => {
  if (c.pricingModel === 'CPM') return Math.floor((r.impressions * (c.rate || 0)) / 1000);
  if (c.pricingModel === 'CPC') return r.clicks * (c.rate || 0);
  return null;
};

// GET /api/ads/campaigns/:id/report?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
const campaignReport = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (!canRead(c, req.user)) return fail(res, 403, 'You do not have access to this campaign');
    const dayRe = /^\d{4}-\d{2}-\d{2}$/;
    const from = dayRe.test(req.query.from || '') ? req.query.from : nepalDay(new Date(c.startDate));
    const to = dayRe.test(req.query.to || '') ? req.query.to : nepalDay();
    const rows = await AdMetricDaily.find({ campaign: c._id, day: { $gte: from, $lte: to } }).lean();

    const byDay = {};
    const byCreative = {};
    const byPlacement = {};
    const total = emptyRow();
    for (const r of rows) {
      (byDay[r.day] ||= emptyRow()) && addRow(byDay[r.day], r);
      (byCreative[r.creative] ||= emptyRow()) && addRow(byCreative[r.creative], r);
      const pk = `${r.placement}|${r.surface}`;
      (byPlacement[pk] ||= emptyRow()) && addRow(byPlacement[pk], r);
      addRow(total, r);
    }
    const names = Object.fromEntries(c.creatives.map((k) => [String(k._id), k.name || k.headline || k.format]));
    const days = Object.keys(byDay).sort().map((day) => ({ day, ...byDay[day], ...rates(byDay[day]), spend: spendForRow(c, byDay[day]) }));

    if (req.query.format === 'csv') {
      const head = ['day', ...METRIC_KEYS, 'ctr_pct', 'viewable_pct', 'spend_npr'];
      const lines = [head.join(',')].concat(days.map((d) => [d.day, ...METRIC_KEYS.map((k) => d[k]), d.ctr, d.viewableRate, d.spend ?? ''].join(',')));
      const safe = c.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'campaign';
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="hateymalo-ad-${safe}-${from}-to-${to}.csv"`);
      return res.send(lines.join('\n'));
    }

    res.json({
      success: true,
      data: {
        campaign: shapeCampaign(c, req.user, { withHistory: false }),
        range: { from, to },
        totals: { ...total, ...rates(total), spend: spendOf(c) },
        days,
        byCreative: Object.entries(byCreative).map(([id, r]) => ({ creative: id, name: names[id] || 'Removed creative', ...r, ...rates(r) })),
        byPlacement: Object.entries(byPlacement).map(([k, r]) => ({ placement: k.split('|')[0], surface: k.split('|')[1], ...r, ...rates(r) })),
        notes: [
          'Impressions count only ads that actually appeared on screen; viewable means at least half the ad was visible for one second (two for video).',
          'Filtered traffic (staff views, bots, repeats and expired links) is shown separately and never billed.',
        ],
      },
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Staff: review queue, placements, summary                            */
/* ------------------------------------------------------------------ */

// GET /api/ads/admin/campaigns?status=A,B&advertiser=<id>
const adminListCampaigns = async (req, res) => {
  try {
    if (!isAdStaff(req.user)) return fail(res, 403, 'You do not have access to advertising');
    await sweepEnded();
    const q = {};
    if (req.query.status) q.status = { $in: String(req.query.status).split(',').map((s) => s.toUpperCase()) };
    if (isId(req.query.advertiser)) q.advertiser = req.query.advertiser;
    const list = await AdCampaign.find(q).populate('advertiser', 'name type verificationStatus logos members').sort({ submittedAt: -1, createdAt: -1 }).limit(300);
    res.json({ success: true, data: list.map((c) => shapeCampaign(c, req.user, { withHistory: false })) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/ads/campaigns/:id/review  { decision: APPROVE|REJECT, reason, creatives: [{_id, status, reason}] }
const reviewCampaign = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Campaign not found');
    const c = await loadCampaign(req.params.id);
    if (!c) return fail(res, 404, 'Campaign not found');
    if (c.status !== 'IN_REVIEW') return fail(res, 400, 'Only campaigns waiting for review can be approved or rejected');
    const decision = String(req.body?.decision || '').toUpperCase();
    const reason = str(req.body?.reason, 500);
    if (!['APPROVE', 'REJECT'].includes(decision)) return fail(res, 400, 'Decision must be APPROVE or REJECT');
    if (decision === 'REJECT' && !reason) return fail(res, 400, 'Tell the advertiser why the campaign was rejected');

    for (const d of Array.isArray(req.body?.creatives) ? req.body.creatives : []) {
      const k = c.creatives.id(d?._id);
      if (!k) continue;
      const s = String(d.status || '').toUpperCase();
      if (s === 'REJECTED') {
        k.status = 'REJECTED';
        k.rejectionReason = str(d.reason, 500) || 'Does not meet our ad guidelines';
      } else if (s === 'APPROVED') {
        k.status = 'APPROVED';
        k.rejectionReason = '';
      }
    }

    if (decision === 'APPROVE') {
      if (c.advertiser.verificationStatus !== 'VERIFIED') return fail(res, 400, `Verify the sponsor account "${c.advertiser.name}" before approving its ads`);
      c.creatives.forEach((k) => {
        if (k.status === 'PENDING') k.status = 'APPROVED';
      });
      if (!c.creatives.some((k) => k.status === 'APPROVED' && k.isActive)) return fail(res, 400, 'Approve at least one active creative, or reject the campaign');
      if (c.pricingModel !== 'FLAT' && (!c.rate || !c.budget)) return fail(res, 400, 'Set a rate and budget before approving');
      if (c.endDate < new Date()) return fail(res, 400, 'The end date has passed — ask the advertiser for new dates');
      c.status = 'APPROVED';
      c.rejectionReason = '';
    } else {
      c.status = 'REJECTED';
      c.rejectionReason = reason;
    }
    c.reviewedBy = req.user._id;
    c.reviewedAt = new Date();
    c.history.push({ status: c.status, note: reason || (decision === 'APPROVE' ? 'Approved' : ''), by: req.user._id });
    await c.save();
    await syncCampaignContracted(c, req.user);
    audit(req, `${decision === 'APPROVE' ? 'Approved' : 'Rejected'} ad campaign "${c.title}"`, c._id, reason);
    notifyAdvertiser(
      c.advertiser._id,
      req.user._id,
      decision === 'APPROVE' ? 'Your ad is approved' : 'Your ad needs changes',
      decision === 'APPROVE' ? `"${c.title}" is approved and will run from ${nepalDay(c.startDate)}.` : `"${c.title}" was not approved: ${reason}`,
      `/sponsor/ads/${c._id}`
    ).catch(() => {});
    const fresh = await loadCampaign(c._id);
    res.json({ success: true, message: decision === 'APPROVE' ? 'Campaign approved' : 'Campaign rejected', data: shapeCampaign(fresh, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const parsePlacementBody = (b, isNew) => {
  const out = {};
  const errors = [];
  if (isNew || b.key !== undefined) {
    const key = str(b.key, 60).toLowerCase();
    if (!/^[a-z0-9]+(\.[a-z0-9_-]+)+$/.test(key)) errors.push('Key must look like "page.slot" (lowercase letters, digits, dots)');
    else out.key = key;
  }
  if (isNew || b.name !== undefined) {
    out.name = str(b.name, 120);
    if (!out.name) errors.push('Placement name is required');
  }
  if (b.description !== undefined) out.description = str(b.description, 500);
  if (b.surfaces !== undefined) {
    out.surfaces = Array.isArray(b.surfaces) ? [...new Set(b.surfaces.filter((s) => SURFACES.includes(s)))] : [];
    if (!out.surfaces.length) errors.push('Choose the website, the app, or both');
  }
  if (b.formats !== undefined) {
    out.formats = Array.isArray(b.formats) ? [...new Set(b.formats.filter((f) => AD_FORMATS.includes(f)))] : [];
    if (!out.formats.length) errors.push('Allow at least one format');
  }
  for (const k of ['width', 'height']) if (b[k] !== undefined) out[k] = Math.min(4000, int(b[k]));
  if (b.maxAds !== undefined) out.maxAds = Math.max(1, Math.min(5, int(b.maxAds) || 1));
  if (b.rateCard !== undefined) out.rateCard = { flatPerDay: int(b.rateCard?.flatPerDay), cpm: int(b.rateCard?.cpm), cpc: int(b.rateCard?.cpc) };
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  if (b.order !== undefined) out.order = Math.min(999, int(b.order));
  return { out, errors };
};

// GET /api/ads/admin/placements  (all, with how many live campaigns use each)
const adminListPlacements = async (req, res) => {
  try {
    if (!isAdStaff(req.user)) return fail(res, 403, 'You do not have access to advertising');
    await AdPlacement.ensureDefaults();
    const list = await AdPlacement.find().sort({ order: 1, name: 1 }).lean();
    const counts = await AdCampaign.aggregate([{ $match: { status: { $in: ['APPROVED', 'PAUSED', 'IN_REVIEW'] } } }, { $unwind: '$placements' }, { $group: { _id: '$placements', n: { $sum: 1 } } }]);
    const byKey = Object.fromEntries(counts.map((x) => [x._id, x.n]));
    res.json({ success: true, data: list.map((p) => ({ ...p, activeCampaigns: byKey[p.key] || 0 })) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/ads/admin/placements
const createPlacement = async (req, res) => {
  try {
    const { out, errors } = parsePlacementBody(req.body || {}, true);
    if (errors.length) return fail(res, 400, errors[0]);
    if (await AdPlacement.exists({ key: out.key })) return fail(res, 409, 'A placement with this key already exists');
    const p = await AdPlacement.create(out);
    audit(req, `Created ad placement "${p.key}"`, p._id);
    res.status(201).json({ success: true, message: 'Placement created. It shows ads only where the website or app has a matching slot.', data: p });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/ads/admin/placements/:id  (key cannot change once campaigns use it)
const updatePlacement = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Placement not found');
    const p = await AdPlacement.findById(req.params.id);
    if (!p) return fail(res, 404, 'Placement not found');
    const { out, errors } = parsePlacementBody(req.body || {}, false);
    if (errors.length) return fail(res, 400, errors[0]);
    if (out.key && out.key !== p.key) {
      if (await AdCampaign.exists({ placements: p.key })) return fail(res, 409, 'Campaigns use this key, so it cannot be renamed. Create a new placement instead.');
      if (await AdPlacement.exists({ key: out.key })) return fail(res, 409, 'A placement with this key already exists');
    }
    Object.assign(p, out);
    await p.save();
    audit(req, `Updated ad placement "${p.key}"${out.isActive === false ? ' (deactivated)' : ''}`, p._id);
    res.json({ success: true, message: 'Placement saved', data: p });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/ads/admin/placements/:id  (only when no campaign ever used it)
const deletePlacement = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Placement not found');
    const p = await AdPlacement.findById(req.params.id);
    if (!p) return fail(res, 404, 'Placement not found');
    if (await AdCampaign.exists({ placements: p.key })) return fail(res, 409, 'Campaigns use this placement. Deactivate it instead.');
    await p.deleteOne();
    audit(req, `Deleted ad placement "${p.key}"`, p._id);
    res.json({ success: true, message: 'Placement deleted' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/ads/admin/summary  — counts, last 30 days of traffic, money
const adminSummary = async (req, res) => {
  try {
    if (!isAdStaff(req.user)) return fail(res, 403, 'You do not have access to advertising');
    await sweepEnded();
    const campaigns = await AdCampaign.find({ status: { $ne: 'ARCHIVED' } }).populate('advertiser', 'name').lean();
    const byStatus = {};
    let live = 0;
    let booked = 0;
    let earned = 0;
    for (const c of campaigns) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      if (deliveryStatus(c) === 'LIVE') live += 1;
      if (['APPROVED', 'PAUSED', 'ENDED'].includes(c.status)) {
        booked += bookedValueOf(c);
        earned += spendOf(c);
      }
    }
    const since = nepalDay(new Date(Date.now() - 29 * DAY_MS));
    const daily = await AdMetricDaily.aggregate([
      { $match: { day: { $gte: since } } },
      { $group: { _id: '$day', impressions: { $sum: '$impressions' }, viewable: { $sum: '$viewable' }, clicks: { $sum: '$clicks' }, filtered: { $sum: { $add: ['$filteredImpressions', '$filteredClicks'] } } } },
      { $sort: { _id: 1 } },
    ]);
    const last30 = daily.reduce((a, d) => ({ impressions: a.impressions + d.impressions, viewable: a.viewable + d.viewable, clicks: a.clicks + d.clicks, filtered: a.filtered + d.filtered }), { impressions: 0, viewable: 0, clicks: 0, filtered: 0 });
    const top = campaigns
      .filter((c) => c.totals?.impressions)
      .sort((a, b) => b.totals.impressions - a.totals.impressions)
      .slice(0, 5)
      .map((c) => ({ _id: c._id, title: c.title, advertiser: c.advertiser?.name, impressions: c.totals.impressions, clicks: c.totals.clicks, ctr: rates(c.totals).ctr, deliveryStatus: deliveryStatus(c) }));
    res.json({
      success: true,
      data: {
        byStatus,
        live,
        awaitingReview: byStatus.IN_REVIEW || 0,
        last30: { ...last30, ...rates(last30), days: daily.map((d) => ({ day: d._id, impressions: d.impressions, viewable: d.viewable, clicks: d.clicks })) },
        money: { booked, earned, note: 'Booked = flat prices plus CPM/CPC budgets of approved campaigns. Earned = delivered so far. Payments are recorded in the revenue ledger (coming next).' },
        top,
      },
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

module.exports = {
  listPlacements,
  serveAds,
  trackEvents,
  clickAd,
  createCampaign,
  myCampaigns,
  getCampaign,
  updateCampaign,
  submitCampaign,
  changeCampaignStatus,
  deleteCampaign,
  campaignReport,
  adminListCampaigns,
  reviewCampaign,
  adminListPlacements,
  createPlacement,
  updatePlacement,
  deletePlacement,
  adminSummary,
  // exported for tests
  _internals: { spendOf, deliveryStatus, quoteFromRateCard, nepalDay },
};
