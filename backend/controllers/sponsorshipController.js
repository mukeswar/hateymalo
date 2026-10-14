const mongoose = require('mongoose');
const SponsorAccount = require('../models/SponsorAccount');
const SponsorshipOpportunity = require('../models/SponsorshipOpportunity');
const SponsorshipTier = require('../models/SponsorshipTier');
const SponsorshipDeal = require('../models/SponsorshipDeal');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { hasPermission } = require('../utils/permissions');
const { createAuditLog } = require('../utils/auditLogger');

const { DELIVERABLE_TYPES, RESOURCE_TYPES, BRAND_PLACEMENTS } = SponsorshipOpportunity;
const { CONTRACTED_STAGES } = SponsorshipDeal;

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
// '' when empty, the URL when valid, null when invalid (caller rejects)
const optUrl = (v) => (!v ? '' : isHttpUrl(v) ? v.trim() : null);
const optDate = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
const strList = (arr, maxItems, maxLen) =>
  Array.isArray(arr) ? arr.map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems) : [];
const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

const canManage = (u) => hasPermission(u, 'canManageSponsorships');
const canBrand = (u) => canManage(u) || hasPermission(u, 'canManageBrandKits');
const canFinance = (u) => hasPermission(u, 'canManageSponsorFinance');
const isOrganizerOf = (opp, u) => !!u && (opp?.organizers || []).some((id) => sameId(id, u._id));
const memberRole = (account, u) => {
  if (!u || !account) return null;
  const m = (account.members || []).find((x) => sameId(x.user, u._id));
  return m ? m.role : null;
};
const myAccountIds = async (u) => (await SponsorAccount.find({ 'members.user': u._id }).select('_id')).map((a) => a._id);

const audit = (req, action, targetType, targetId = null, details = '') =>
  createAuditLog({ adminUser: req.user, action, targetType, targetId, details, req });

const notifyUsers = async (userIds, senderId, title, message, link) => {
  const ids = [...new Set(userIds.map(String))].filter((id) => id !== String(senderId));
  if (!ids.length) return;
  await Notification.insertMany(ids.map((recipient) => ({ recipient, sender: senderId, type: 'SPONSORSHIP', title, message, link })));
};
const notifySponsorMembers = async (accountId, senderId, title, message, link) => {
  const acc = await SponsorAccount.findById(accountId).select('members');
  if (acc) await notifyUsers(acc.members.map((m) => m.user), senderId, title, message, link);
};
const notifyCampaignTeam = async (opp, senderId, title, message, link) => {
  const staff = await User.find({ role: { $in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] } }).select('role permissions');
  const managers = staff.filter((s) => canManage(s)).map((s) => s._id);
  await notifyUsers([...managers, ...(opp.organizers || [])], senderId, title, message, link);
};

const ACTIVE_STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED'];
const PUBLIC_OPP_STATUSES = ['OPEN', 'CLOSED', 'COMPLETED'];

const parseResourceList = (arr) =>
  Array.isArray(arr)
    ? arr.slice(0, 50).map((r) => ({
        type: pick(r?.type, RESOURCE_TYPES, 'OTHER'),
        description: str(r?.description, 300),
        quantity: int(r?.quantity),
        unit: str(r?.unit, 30),
      })).filter((r) => r.description)
    : [];

const parseInKind = (arr) =>
  Array.isArray(arr)
    ? arr.slice(0, 50).map((r) => ({
        ...(isId(r?._id) ? { _id: r._id } : {}),
        type: pick(r?.type, RESOURCE_TYPES, 'MATERIALS'),
        description: str(r?.description, 300),
        quantity: int(r?.quantity),
        unit: str(r?.unit, 30),
        estimatedValue: int(r?.estimatedValue),
        valuationMethod: pick(r?.valuationMethod, ['SPONSOR_INVOICE', 'MARKET_QUOTE', 'SPONSOR_DECLARED', 'STAFF_ESTIMATE', 'NOT_VALUED'], 'NOT_VALUED'),
        status: pick(r?.status, ['PLEDGED', 'RECEIVED', 'CANCELLED'], 'PLEDGED'),
        receivedAt: r?.status === 'RECEIVED' ? optDate(r?.receivedAt) || new Date() : null,
      })).filter((r) => r.description)
    : [];

// Opportunity fields an editor may set (status/organizers handled separately)
const parseOpportunityBody = (b) => {
  const out = {};
  const errors = [];
  if (b.title !== undefined) out.title = str(b.title, 160);
  if (b.campaignType !== undefined) out.campaignType = pick(b.campaignType, ['CLEANUP', 'BLOOD_DONATION', 'TREE_PLANTATION', 'EDUCATION', 'DISASTER_RELIEF', 'FOOD_DISTRIBUTION', 'HEALTH', 'OTHER'], 'OTHER');
  if (b.summary !== undefined) out.summary = str(b.summary, 300);
  if (b.description !== undefined) out.description = str(b.description, 8000);
  if (b.objectives !== undefined) out.objectives = strList(b.objectives, 20, 300);
  if (b.coverImage !== undefined) {
    const u = optUrl(b.coverImage);
    if (u === null) errors.push('Cover image must be an http(s) link');
    else out.coverImage = u;
  }
  if (b.location !== undefined) out.location = str(b.location, 200);
  for (const k of ['startDate', 'endDate']) {
    if (b[k] !== undefined) {
      const d = optDate(b[k]);
      if (d === undefined) errors.push(`${k} is not a valid date`);
      else out[k] = d;
    }
  }
  if (b.schedule !== undefined) out.schedule = str(b.schedule, 2000);
  if (b.expectedAudience !== undefined) {
    out.expectedAudience = { count: int(b.expectedAudience?.count), description: str(b.expectedAudience?.description, 500) };
  }
  if (b.fundingGoal !== undefined) out.fundingGoal = int(b.fundingGoal);
  if (b.resourceNeeds !== undefined) out.resourceNeeds = parseResourceList(b.resourceNeeds);
  if (b.deliverablesTemplate !== undefined) {
    out.deliverablesTemplate = Array.isArray(b.deliverablesTemplate)
      ? b.deliverablesTemplate.slice(0, 40).map((d) => ({
          title: str(d?.title, 200),
          type: pick(d?.type, DELIVERABLE_TYPES, 'OTHER'),
          dueOffsetDays: Math.max(-365, Math.min(365, Math.round(Number(d?.dueOffsetDays) || 0))),
        })).filter((d) => d.title)
      : [];
  }
  for (const k of ['event', 'donationCampaign']) {
    if (b[k] !== undefined) {
      if (b[k] && !isId(b[k])) errors.push(`${k} is not a valid id`);
      else out[k] = b[k] || null;
    }
  }
  if (out.startDate && out.endDate && out.endDate < out.startDate) errors.push('End date must be after the start date');
  return { out, errors };
};

const parseTierBody = (b) => {
  const out = {};
  if (b.name !== undefined) out.name = str(b.name, 80);
  if (b.level !== undefined) out.level = pick(b.level, ['TITLE', 'GOLD', 'SILVER', 'BRONZE', 'COMMUNITY_PARTNER', 'MEDIA_PARTNER', 'IN_KIND', 'CUSTOM'], 'CUSTOM');
  if (b.description !== undefined) out.description = str(b.description, 1000);
  if (b.price !== undefined) out.price = int(b.price);
  if (b.priceNote !== undefined) out.priceNote = str(b.priceNote, 120);
  if (b.benefits !== undefined) out.benefits = strList(b.benefits, 30, 200);
  if (b.logoSize !== undefined) out.logoSize = pick(b.logoSize, ['XL', 'L', 'M', 'S', 'NONE'], 'M');
  if (b.slots !== undefined) out.slots = int(b.slots);
  if (b.order !== undefined) out.order = Math.round(Number(b.order) || 0);
  if (b.isActive !== undefined) out.isActive = !!b.isActive;
  return out;
};

// Count contracted deals per tier for slot availability
const takenByTier = async (tierIds) => {
  if (!tierIds.length) return {};
  const rows = await SponsorshipDeal.aggregate([
    { $match: { tier: { $in: tierIds }, stage: { $in: CONTRACTED_STAGES } } },
    { $group: { _id: '$tier', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
};

const publicTier = (t, taken) => ({
  _id: t._id,
  name: t.name,
  level: t.level,
  description: t.description,
  price: t.price,
  priceNote: t.priceNote,
  benefits: t.benefits,
  logoSize: t.logoSize,
  slots: t.slots,
  slotsLeft: t.slots === 0 ? null : Math.max(0, t.slots - (taken[String(t._id)] || 0)),
  order: t.order,
});

// Sponsors shown publicly: contracted, sponsor approved logo use, not hidden
const publicSponsorsFor = async (oppIds) => {
  const deals = await SponsorshipDeal.find({ opportunity: { $in: oppIds }, stage: { $in: CONTRACTED_STAGES }, showOnPublicPage: true })
    .select('opportunity sponsor tier logoUrl logoUsageApproved')
    .populate('sponsor', 'name type website')
    .populate('tier', 'name level order logoSize');
  return deals
    .filter((d) => d.sponsor)
    .map((d) => ({
      opportunity: d.opportunity,
      deal: d._id,
      name: d.sponsor.name,
      type: d.sponsor.type,
      website: d.sponsor.website,
      tier: d.tier ? { name: d.tier.name, level: d.tier.level, order: d.tier.order, logoSize: d.tier.logoSize } : null,
      logoUrl: d.logoUsageApproved ? d.logoUrl : '',
    }));
};

const fundingSecuredPct = async (opp) => {
  if (!opp.fundingGoal) return null;
  const [row] = await SponsorshipDeal.aggregate([
    { $match: { opportunity: opp._id, stage: { $in: CONTRACTED_STAGES } } },
    { $group: { _id: null, cash: { $sum: '$cashAmount' } } },
  ]);
  return Math.min(100, Math.round(((row?.cash || 0) / opp.fundingGoal) * 100));
};

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

// GET /api/sponsorship/opportunities  (public: open/closed/completed only)
const listPublicOpportunities = async (req, res) => {
  try {
    const status = PUBLIC_OPP_STATUSES.includes(req.query.status) ? [req.query.status] : ['OPEN'];
    const q = { status: { $in: status } };
    if (req.query.campaignType) q.campaignType = str(req.query.campaignType, 40);
    const opps = await SponsorshipOpportunity.find(q)
      .select('title campaignType summary coverImage location startDate endDate fundingGoal expectedAudience status event')
      .sort({ startDate: 1, createdAt: -1 })
      .limit(100);
    const ids = opps.map((o) => o._id);
    const tiers = await SponsorshipTier.find({ opportunity: { $in: ids }, isActive: true }).select('opportunity price');
    const sponsors = await publicSponsorsFor(ids);
    const data = await Promise.all(
      opps.map(async (o) => {
        const own = tiers.filter((t) => sameId(t.opportunity, o._id));
        const priced = own.map((t) => t.price).filter((p) => p > 0);
        return {
          ...o.toObject(),
          tierCount: own.length,
          startingPrice: priced.length ? Math.min(...priced) : null,
          sponsors: sponsors.filter((s) => sameId(s.opportunity, o._id)),
          fundingSecuredPct: await fundingSecuredPct(o),
        };
      })
    );
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/opportunities/:id  (drafts visible to managers/organizers only)
const getPublicOpportunity = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id)
      .populate('event', 'title date location status')
      .populate('donationCampaign', 'title status')
      .populate('organizers', 'name profilePicture');
    if (!opp) return fail(res, 404, 'Opportunity not found');
    const viewer = {
      canManage: canManage(req.user),
      isOrganizer: isOrganizerOf(opp, req.user),
      canBrand: canBrand(req.user),
    };
    if (!PUBLIC_OPP_STATUSES.includes(opp.status) && !viewer.canManage && !viewer.isOrganizer) {
      return fail(res, 404, 'Opportunity not found');
    }
    const tiers = await SponsorshipTier.find({ opportunity: opp._id, isActive: true }).sort({ order: 1, price: -1 });
    const taken = await takenByTier(tiers.map((t) => t._id));
    const data = opp.toObject();
    delete data.brandKit;
    delete data.createdBy;
    res.json({
      success: true,
      data: {
        ...data,
        tiers: tiers.map((t) => publicTier(t, taken)),
        sponsors: await publicSponsorsFor([opp._id]),
        fundingSecuredPct: await fundingSecuredPct(opp),
        viewer,
      },
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Sponsor accounts                                                    */
/* ------------------------------------------------------------------ */

const parseAccountBody = (b) => {
  const out = {};
  const errors = [];
  if (b.name !== undefined) out.name = str(b.name, 140);
  if (b.type !== undefined) out.type = pick(b.type, ['COMPANY', 'NGO', 'LOCAL_BUSINESS', 'EDUCATION', 'GOVERNMENT', 'MEDIA', 'INDIVIDUAL', 'OTHER'], 'COMPANY');
  if (b.description !== undefined) out.description = str(b.description, 2000);
  if (b.website !== undefined) {
    const u = optUrl(b.website);
    if (u === null) errors.push('Website must be an http(s) link');
    else out.website = u;
  }
  if (b.panNumber !== undefined) out.panNumber = str(b.panNumber, 20);
  if (b.vatRegistered !== undefined) out.vatRegistered = !!b.vatRegistered;
  if (b.address !== undefined) out.address = str(b.address, 300);
  if (b.contactName !== undefined) out.contactName = str(b.contactName, 120);
  if (b.contactEmail !== undefined) {
    const e = str(b.contactEmail, 160).toLowerCase();
    if (e && !/^\S+@\S+\.\S+$/.test(e)) errors.push('Contact email is not valid');
    else out.contactEmail = e;
  }
  if (b.contactPhone !== undefined) out.contactPhone = str(b.contactPhone, 40);
  if (b.logos !== undefined) {
    const logos = Array.isArray(b.logos) ? b.logos.slice(0, 10) : [];
    out.logos = [];
    for (const l of logos) {
      if (!isHttpUrl(l?.url)) {
        errors.push('Each logo needs an http(s) image link');
        break;
      }
      out.logos.push({ label: str(l.label, 60) || 'Logo', url: l.url.trim(), background: pick(l.background, ['LIGHT', 'DARK', 'ANY'], 'ANY') });
    }
  }
  return { out, errors };
};

const accountForViewer = (acc, user) => {
  const a = acc.toObject();
  a.myRole = memberRole(acc, user);
  return a;
};

// POST /api/sponsorship/accounts
const createAccount = async (req, res) => {
  try {
    const { out, errors } = parseAccountBody(req.body || {});
    if (errors.length) return fail(res, 400, errors[0]);
    if (!out.name) return fail(res, 400, 'Organisation name is required');
    const owned = await SponsorAccount.countDocuments({ members: { $elemMatch: { user: req.user._id, role: 'OWNER' } } });
    if (owned >= 10) return fail(res, 400, 'You can own at most 10 sponsor accounts');
    const acc = await SponsorAccount.create({
      ...out,
      contactName: out.contactName || req.user.name,
      contactEmail: out.contactEmail || req.user.email,
      members: [{ user: req.user._id, role: 'OWNER' }],
      createdBy: req.user._id,
    });
    audit(req, `Registered sponsor account "${acc.name}"`, 'SPONSOR', acc._id);
    notifyCampaignTeam({ organizers: [] }, req.user._id, 'New sponsor account', `${acc.name} registered as a sponsor and is waiting for verification.`, '/admin?tab=sponsors').catch(() => {});
    res.status(201).json({ success: true, message: 'Sponsor account created. Our team will verify it shortly.', data: accountForViewer(acc, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/accounts/mine
const myAccounts = async (req, res) => {
  try {
    const accs = await SponsorAccount.find({ 'members.user': req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: accs.map((a) => accountForViewer(a, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/accounts/:id  (members and sponsorship managers)
const getAccount = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Sponsor account not found');
    const acc = await SponsorAccount.findById(req.params.id).populate('members.user', 'name email profilePicture');
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    if (!memberRole(acc, req.user) && !canManage(req.user) && !canFinance(req.user)) return fail(res, 403, 'You do not have access to this sponsor account');
    res.json({ success: true, data: accountForViewer(acc, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/accounts/:id  (OWNER/EDITOR)
const updateAccount = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Sponsor account not found');
    const acc = await SponsorAccount.findById(req.params.id);
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    const role = memberRole(acc, req.user);
    if (!['OWNER', 'EDITOR'].includes(role)) return fail(res, 403, 'Only owners and editors can change this account');
    const { out, errors } = parseAccountBody(req.body || {});
    if (errors.length) return fail(res, 400, errors[0]);
    if (out.name === '') return fail(res, 400, 'Organisation name is required');
    // Identity changes after verification need a fresh check
    const identityChanged = (out.name && out.name !== acc.name) || (out.panNumber !== undefined && out.panNumber !== acc.panNumber);
    Object.assign(acc, out);
    if (identityChanged && acc.verificationStatus === 'VERIFIED') {
      acc.verificationStatus = 'PENDING';
      acc.verificationNote = 'Name or PAN changed; re-verification needed.';
    }
    await acc.save();
    res.json({ success: true, message: 'Sponsor account updated', data: accountForViewer(acc, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/sponsorship/accounts/:id/members  { email, role }  (OWNER)
const addAccountMember = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Sponsor account not found');
    const acc = await SponsorAccount.findById(req.params.id);
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    if (memberRole(acc, req.user) !== 'OWNER') return fail(res, 403, 'Only owners can add team members');
    const email = str(req.body?.email, 160).toLowerCase();
    const user = email ? await User.findOne({ email }).select('_id name') : null;
    if (!user) return fail(res, 404, 'No Hateymalo member has that email. Ask them to register first.');
    if (memberRole(acc, user)) return fail(res, 400, 'That person is already on this account');
    acc.members.push({ user: user._id, role: pick(req.body?.role, ['OWNER', 'EDITOR', 'VIEWER'], 'EDITOR') });
    await acc.save();
    await notifyUsers([user._id], req.user._id, 'Added to a sponsor account', `${req.user.name} added you to ${acc.name}.`, '/sponsor/portal');
    await acc.populate('members.user', 'name email profilePicture');
    res.json({ success: true, message: `${user.name} added`, data: accountForViewer(acc, req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/sponsorship/accounts/:id/members/:userId  (OWNER, or a member leaving)
const removeAccountMember = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.userId)) return fail(res, 404, 'Not found');
    const acc = await SponsorAccount.findById(req.params.id);
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    const leaving = sameId(req.params.userId, req.user._id);
    if (!leaving && memberRole(acc, req.user) !== 'OWNER') return fail(res, 403, 'Only owners can remove team members');
    const target = acc.members.find((m) => sameId(m.user, req.params.userId));
    if (!target) return fail(res, 404, 'That person is not on this account');
    if (target.role === 'OWNER' && acc.members.filter((m) => m.role === 'OWNER').length === 1) {
      return fail(res, 400, 'An account needs at least one owner. Make someone else an owner first.');
    }
    acc.members = acc.members.filter((m) => !sameId(m.user, req.params.userId));
    await acc.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/admin/accounts?status=  (managers, finance)
const adminListAccounts = async (req, res) => {
  try {
    if (!canManage(req.user) && !canFinance(req.user)) return fail(res, 403, 'Not allowed');
    const q = {};
    if (['PENDING', 'VERIFIED', 'REJECTED'].includes(req.query.status)) q.verificationStatus = req.query.status;
    const accs = await SponsorAccount.find(q).populate('members.user', 'name email').sort({ createdAt: -1 }).limit(500);
    const counts = await SponsorshipDeal.aggregate([
      { $match: { sponsor: { $in: accs.map((a) => a._id) } } },
      { $group: { _id: '$sponsor', deals: { $sum: 1 }, contracted: { $sum: { $cond: [{ $in: ['$stage', CONTRACTED_STAGES] }, 1, 0] } } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));
    res.json({
      success: true,
      data: accs.map((a) => ({ ...a.toObject(), dealCount: byId[String(a._id)]?.deals || 0, contractedDeals: byId[String(a._id)]?.contracted || 0 })),
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/admin/accounts/:id/verify  { status, note }
const verifyAccount = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Sponsor account not found');
    const status = req.body?.status;
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) return fail(res, 400, 'Status must be PENDING, VERIFIED or REJECTED');
    const acc = await SponsorAccount.findById(req.params.id);
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    acc.verificationStatus = status;
    acc.verificationNote = str(req.body?.note, 500);
    acc.verifiedBy = status === 'PENDING' ? null : req.user._id;
    acc.verifiedAt = status === 'PENDING' ? null : new Date();
    await acc.save();
    audit(req, `Set sponsor "${acc.name}" verification to ${status}`, 'SPONSOR', acc._id, acc.verificationNote);
    await notifySponsorMembers(acc._id, req.user._id, status === 'VERIFIED' ? 'Sponsor account verified' : 'Sponsor account update',
      status === 'VERIFIED' ? `${acc.name} is now a verified Hateymalo sponsor.` : `${acc.name} verification: ${status.toLowerCase()}${acc.verificationNote ? ` — ${acc.verificationNote}` : ''}`,
      '/sponsor/portal');
    res.json({ success: true, message: `Account ${status.toLowerCase()}`, data: acc });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Opportunities (staff / organizers)                                  */
/* ------------------------------------------------------------------ */

const dealStats = async (oppIds, withMoney, withReceived) => {
  const rows = await SponsorshipDeal.aggregate([
    { $match: { opportunity: { $in: oppIds } } },
    {
      $group: {
        _id: '$opportunity',
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $in: ['$stage', ['APPLIED', 'IN_REVIEW', 'NEGOTIATING']] }, 1, 0] } },
        contracted: { $sum: { $cond: [{ $in: ['$stage', CONTRACTED_STAGES] }, 1, 0] } },
        contractedCash: { $sum: { $cond: [{ $in: ['$stage', CONTRACTED_STAGES] }, '$cashAmount', 0] } },
        received: { $sum: { $cond: [{ $in: ['$stage', CONTRACTED_STAGES] }, { $sum: '$payments.amount' }, 0] } },
      },
    },
  ]);
  return Object.fromEntries(
    rows.map((r) => [
      String(r._id),
      {
        total: r.total,
        open: r.open,
        contracted: r.contracted,
        ...(withMoney ? { contractedCash: r.contractedCash } : {}),
        ...(withReceived ? { received: r.received } : {}),
      },
    ])
  );
};

// GET /api/sponsorship/admin/opportunities
const adminListOpportunities = async (req, res) => {
  try {
    const manager = canManage(req.user) || canBrand(req.user) || canFinance(req.user);
    const q = manager ? {} : { organizers: req.user._id };
    if (req.query.status) q.status = str(req.query.status, 20);
    const opps = await SponsorshipOpportunity.find(q).populate('organizers', 'name').sort({ createdAt: -1 }).limit(300);
    if (!manager && !opps.length) return res.json({ success: true, data: [] });
    const stats = await dealStats(opps.map((o) => o._id), canManage(req.user) || canFinance(req.user), canFinance(req.user));
    res.json({ success: true, data: opps.map((o) => ({ ...o.toObject(), dealStats: stats[String(o._id)] || { total: 0, open: 0, contracted: 0 } })) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/sponsorship/opportunities  (managers)
const createOpportunity = async (req, res) => {
  try {
    const { out, errors } = parseOpportunityBody(req.body || {});
    if (errors.length) return fail(res, 400, errors[0]);
    if (!out.title) return fail(res, 400, 'Title is required');
    const organizers = Array.isArray(req.body?.organizers) ? req.body.organizers.filter(isId).slice(0, 20) : [];
    const opp = await SponsorshipOpportunity.create({
      ...out,
      status: pick(req.body?.status, ['DRAFT', 'OPEN'], 'DRAFT'),
      organizers,
      createdBy: req.user._id,
    });
    // Optionally start from tier templates
    const templateIds = Array.isArray(req.body?.tierTemplateIds) ? req.body.tierTemplateIds.filter(isId) : [];
    if (templateIds.length) {
      const templates = await SponsorshipTier.find({ _id: { $in: templateIds }, opportunity: null });
      await SponsorshipTier.insertMany(templates.map((t) => {
        const { _id, createdAt, updatedAt, ...rest } = t.toObject();
        return { ...rest, opportunity: opp._id, createdBy: req.user._id };
      }));
    }
    audit(req, `Created sponsorship opportunity "${opp.title}"`, 'SPONSORSHIP', opp._id);
    if (organizers.length) {
      await notifyUsers(organizers, req.user._id, 'You are a campaign organiser', `You can now manage sponsors for "${opp.title}".`, `/organize/${opp._id}`);
    }
    res.status(201).json({ success: true, message: 'Opportunity created', data: opp });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/opportunities/:id  (managers; organizers: details only)
const updateOpportunity = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id);
    if (!opp) return fail(res, 404, 'Opportunity not found');
    const manager = canManage(req.user);
    if (!manager && !isOrganizerOf(opp, req.user)) return fail(res, 403, 'Only sponsorship managers and this campaign’s organisers can edit it');
    const { out, errors } = parseOpportunityBody(req.body || {});
    if (errors.length) return fail(res, 400, errors[0]);
    if (out.title === '') return fail(res, 400, 'Title is required');
    const before = opp.status;
    Object.assign(opp, out);
    if (manager && req.body?.status !== undefined) {
      opp.status = pick(req.body.status, ['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'], opp.status);
    }
    if (manager && Array.isArray(req.body?.organizers)) {
      const added = req.body.organizers.filter(isId).filter((id) => !opp.organizers.some((o) => sameId(o, id)));
      opp.organizers = req.body.organizers.filter(isId).slice(0, 20);
      if (added.length) await notifyUsers(added, req.user._id, 'You are a campaign organiser', `You can now manage sponsors for "${opp.title}".`, `/organize/${opp._id}`);
    }
    if (opp.startDate && opp.endDate && opp.endDate < opp.startDate) return fail(res, 400, 'End date must be after the start date');
    await opp.save();
    audit(req, before !== opp.status ? `Set opportunity "${opp.title}" to ${opp.status}` : `Updated opportunity "${opp.title}"`, 'SPONSORSHIP', opp._id);
    res.json({ success: true, message: 'Opportunity updated', data: opp });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/sponsorship/opportunities/:id  (managers; only without live deals)
const deleteOpportunity = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id);
    if (!opp) return fail(res, 404, 'Opportunity not found');
    const live = await SponsorshipDeal.countDocuments({ opportunity: opp._id, stage: { $in: [...ACTIVE_STAGES, 'FULFILLED'] } });
    if (live) return fail(res, 409, `This opportunity has ${live} active or completed deal(s). Cancel or close it instead of deleting.`);
    await SponsorshipDeal.deleteMany({ opportunity: opp._id });
    await SponsorshipTier.deleteMany({ opportunity: opp._id });
    await opp.deleteOne();
    audit(req, `Deleted opportunity "${opp.title}"`, 'SPONSORSHIP', opp._id);
    res.json({ success: true, message: 'Opportunity deleted' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Tiers                                                               */
/* ------------------------------------------------------------------ */

// GET /api/sponsorship/tiers?opportunity=<id|templates>  (managers see inactive too)
const listTiers = async (req, res) => {
  try {
    const o = req.query.opportunity;
    const q = o === 'templates' || !o ? { opportunity: null } : isId(o) ? { opportunity: o } : null;
    if (!q) return fail(res, 400, 'Invalid opportunity id');
    const tiers = await SponsorshipTier.find(q).sort({ order: 1, price: -1 });
    const taken = await takenByTier(tiers.map((t) => t._id));
    res.json({ success: true, data: tiers.map((t) => ({ ...t.toObject(), slotsTaken: taken[String(t._id)] || 0 })) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/sponsorship/tiers  { opportunity?: id, ...tier }
const createTier = async (req, res) => {
  try {
    const out = parseTierBody(req.body || {});
    if (!out.name) return fail(res, 400, 'Tier name is required');
    let opportunity = null;
    if (req.body?.opportunity) {
      if (!isId(req.body.opportunity) || !(await SponsorshipOpportunity.exists({ _id: req.body.opportunity }))) return fail(res, 404, 'Opportunity not found');
      opportunity = req.body.opportunity;
    }
    const tier = await SponsorshipTier.create({ ...out, opportunity, createdBy: req.user._id });
    audit(req, `Created ${opportunity ? '' : 'template '}tier "${tier.name}" (Rs. ${tier.price})`, 'SPONSORSHIP', opportunity || tier._id);
    res.status(201).json({ success: true, message: 'Tier created', data: tier });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/tiers/:id
const updateTier = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Tier not found');
    const tier = await SponsorshipTier.findById(req.params.id);
    if (!tier) return fail(res, 404, 'Tier not found');
    const out = parseTierBody(req.body || {});
    if (out.name === '') return fail(res, 400, 'Tier name is required');
    const oldPrice = tier.price;
    Object.assign(tier, out);
    await tier.save();
    audit(req, `Updated tier "${tier.name}"${oldPrice !== tier.price ? ` price Rs. ${oldPrice} → Rs. ${tier.price}` : ''}`, 'SPONSORSHIP', tier.opportunity || tier._id);
    res.json({ success: true, message: 'Tier updated', data: tier });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/sponsorship/tiers/:id  (deactivates instead when deals use it)
const deleteTier = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Tier not found');
    const tier = await SponsorshipTier.findById(req.params.id);
    if (!tier) return fail(res, 404, 'Tier not found');
    const used = await SponsorshipDeal.countDocuments({ tier: tier._id });
    if (used) {
      tier.isActive = false;
      await tier.save();
      audit(req, `Deactivated tier "${tier.name}" (used by ${used} deal(s))`, 'SPONSORSHIP', tier.opportunity || tier._id);
      return res.json({ success: true, message: `Tier is used by ${used} deal(s), so it was hidden instead of deleted`, data: tier });
    }
    await tier.deleteOne();
    audit(req, `Deleted tier "${tier.name}"`, 'SPONSORSHIP', tier.opportunity || tier._id);
    res.json({ success: true, message: 'Tier deleted' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Deals                                                               */
/* ------------------------------------------------------------------ */

const loadDeal = (id) =>
  SponsorshipDeal.findById(id)
    .populate('opportunity', 'title status startDate endDate location organizers deliverablesTemplate campaignType coverImage fundingGoal')
    .populate('sponsor', 'name type logos members verificationStatus website contactName contactEmail contactPhone panNumber')
    .populate('tier', 'name level price priceNote benefits logoSize slots')
    .populate('messages.author', 'name profilePicture')
    .populate('history.by', 'name')
    .populate('deliverables.completedBy', 'name')
    .populate('payments.recordedBy', 'name');

const viewerFor = (deal, user) => {
  const sponsorRole = memberRole(deal.sponsor, user);
  return {
    isManager: canManage(user),
    isFinance: canFinance(user),
    isBrand: canBrand(user),
    // Conflict of interest: an organiser who belongs to the sponsoring
    // organisation acts on this deal only as the sponsor.
    isOrganizer: isOrganizerOf(deal.opportunity, user) && !sponsorRole,
    sponsorRole,
    isSponsor: !!sponsorRole,
  };
};
const canSeeDeal = (v) => v.isManager || v.isFinance || v.isOrganizer || v.isSponsor || v.isBrand;

// Shapes a deal for whoever is looking: sponsors never see internal notes,
// organisers and brand staff never see money, only finance and the sponsor
// see payments, and sponsors see the impact report only once it is shared.
const serializeDeal = (deal, v) => {
  const d = deal.toObject();
  const staffSide = v.isManager || v.isFinance || v.isOrganizer || v.isBrand;
  if (!staffSide) d.messages = (d.messages || []).filter((m) => !m.internal);
  const seesMoney = v.isManager || v.isFinance || v.isSponsor;
  if (!seesMoney) {
    d.cashAmount = undefined;
    if (d.proposal) d.proposal.amount = undefined;
    d.inKindItems = (d.inKindItems || []).map(({ estimatedValue, ...rest }) => rest);
    d.inKindEstimatedValue = undefined;
    if (d.tier) d.tier.price = undefined;
  }
  if (!v.isFinance && !v.isSponsor) {
    d.payments = undefined;
    d.amountReceived = undefined;
  }
  if (!staffSide && !d.report?.sharedAt) d.report = undefined;
  if (d.sponsor) d.sponsor = { ...d.sponsor, members: undefined, panNumber: v.isSponsor || v.isManager || v.isFinance ? d.sponsor.panNumber : undefined };
  if (d.opportunity) d.opportunity = { ...d.opportunity, organizers: undefined };
  d.viewer = v;
  return d;
};

// POST /api/sponsorship/opportunities/:id/apply
const applyToOpportunity = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id);
    if (!opp || !PUBLIC_OPP_STATUSES.includes(opp.status)) return fail(res, 404, 'Opportunity not found');
    if (opp.status !== 'OPEN') return fail(res, 400, 'This campaign is not taking new sponsors right now');
    const b = req.body || {};
    if (!isId(b.sponsorAccount)) return fail(res, 400, 'Choose which sponsor account is applying');
    const acc = await SponsorAccount.findById(b.sponsorAccount);
    if (!acc) return fail(res, 404, 'Sponsor account not found');
    if (!['OWNER', 'EDITOR'].includes(memberRole(acc, req.user))) return fail(res, 403, 'Only owners and editors of this sponsor account can apply');
    if (acc.verificationStatus === 'REJECTED') return fail(res, 403, 'This sponsor account was not approved. Contact the Hateymalo team.');
    const existing = await SponsorshipDeal.findOne({ opportunity: opp._id, sponsor: acc._id, stage: { $in: ACTIVE_STAGES } });
    if (existing) return fail(res, 409, 'This sponsor already has an active proposal for this campaign', { dealId: existing._id });

    let tier = null;
    if (b.tier) {
      if (!isId(b.tier)) return fail(res, 400, 'Invalid tier');
      tier = await SponsorshipTier.findOne({ _id: b.tier, opportunity: opp._id, isActive: true });
      if (!tier) return fail(res, 400, 'That tier is not offered for this campaign');
      if (tier.slots > 0 && ((await takenByTier([tier._id]))[String(tier._id)] || 0) >= tier.slots) return fail(res, 409, `All ${tier.name} slots are taken. Choose another tier or request a custom package.`);
    }
    const message = str(b.message, 4000);
    if (!tier && !message) return fail(res, 400, 'Describe what you would like to contribute');
    const proposalAmount = b.amount !== undefined ? int(b.amount) : tier ? tier.price : 0;
    const logo = optUrl(b.logoUrl);
    if (logo === null) return fail(res, 400, 'Logo must be an http(s) image link');

    const deal = await SponsorshipDeal.create({
      opportunity: opp._id,
      sponsor: acc._id,
      tier: tier ? tier._id : null,
      isCustomQuote: !tier || !!b.isCustomQuote,
      proposal: {
        message,
        contributionTypes: Array.isArray(b.contributionTypes) ? b.contributionTypes.filter((t) => RESOURCE_TYPES.includes(t)) : [],
        amount: proposalAmount,
        submittedBy: req.user._id,
      },
      inKindItems: parseInKind(b.inKindItems).map((i) => ({ ...i, status: 'PLEDGED', receivedAt: null })),
      logoUrl: logo || acc.logos?.[0]?.url || '',
      history: [{ stage: 'APPLIED', note: 'Proposal submitted', by: req.user._id }],
    });
    audit(req, `${acc.name} applied to sponsor "${opp.title}"${tier ? ` (${tier.name})` : ' (custom proposal)'}`, 'SPONSORSHIP', deal._id);
    await notifyCampaignTeam(opp, req.user._id, 'New sponsorship proposal', `${acc.name} wants to sponsor "${opp.title}"${tier ? ` as ${tier.name}` : ''}.`, `/admin?tab=sponsorDeals&deal=${deal._id}`);
    res.status(201).json({ success: true, message: 'Proposal sent. The Hateymalo team will reply in your sponsor portal.', data: { _id: deal._id } });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/deals/mine
const myDeals = async (req, res) => {
  try {
    const ids = await myAccountIds(req.user);
    const deals = await SponsorshipDeal.find({ sponsor: { $in: ids } })
      .populate('opportunity', 'title status startDate endDate location coverImage campaignType organizers')
      .populate('sponsor', 'name members')
      .populate('tier', 'name level')
      .sort({ updatedAt: -1 });
    res.json({
      success: true,
      data: deals.map((d) => {
        const v = viewerFor(d, req.user);
        const s = serializeDeal(d, v);
        // Keep list payload light
        delete s.messages;
        delete s.history;
        return s;
      }),
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/admin/deals?opportunity=&stage=&sponsor=
const adminListDeals = async (req, res) => {
  try {
    const wide = canManage(req.user) || canFinance(req.user) || canBrand(req.user);
    const q = {};
    if (isId(req.query.opportunity)) q.opportunity = req.query.opportunity;
    if (isId(req.query.sponsor)) q.sponsor = req.query.sponsor;
    if (req.query.stage) q.stage = { $in: String(req.query.stage).split(',').map((s) => s.trim()) };
    if (!wide) {
      const mine = await SponsorshipOpportunity.find({ organizers: req.user._id }).select('_id');
      if (!mine.length) return fail(res, 403, 'Not allowed');
      const allowed = mine.map((o) => String(o._id));
      if (q.opportunity && !allowed.includes(String(q.opportunity))) return fail(res, 403, 'Not your campaign');
      if (!q.opportunity) q.opportunity = { $in: mine.map((o) => o._id) };
    }
    const deals = await SponsorshipDeal.find(q)
      .populate('opportunity', 'title status startDate endDate organizers')
      .populate('sponsor', 'name type verificationStatus members logos')
      .populate('tier', 'name level price')
      .sort({ updatedAt: -1 })
      .limit(500);
    res.json({
      success: true,
      data: deals.map((d) => {
        const s = serializeDeal(d, viewerFor(d, req.user));
        delete s.messages;
        delete s.history;
        return s;
      }),
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/sponsorship/deals/:id
const getDeal = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity || !deal.sponsor) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    if (!canSeeDeal(v)) return fail(res, 403, 'You do not have access to this deal');
    res.json({ success: true, data: serializeDeal(deal, v) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/deals/:id/sponsor  { action, ... }  (sponsor OWNER/EDITOR)
const sponsorUpdateDeal = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.sponsor) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    if (!['OWNER', 'EDITOR'].includes(v.sponsorRole)) return fail(res, 403, 'Only owners and editors of the sponsor account can do this');
    const b = req.body || {};
    const link = `/admin?tab=sponsorDeals&deal=${deal._id}`;
    switch (b.action) {
      case 'UPDATE_PROPOSAL': {
        if (!['APPLIED', 'IN_REVIEW', 'NEGOTIATING'].includes(deal.stage)) return fail(res, 400, 'The proposal can no longer be changed');
        if (b.message !== undefined) deal.proposal.message = str(b.message, 4000);
        if (b.amount !== undefined) deal.proposal.amount = int(b.amount);
        if (Array.isArray(b.contributionTypes)) deal.proposal.contributionTypes = b.contributionTypes.filter((t) => RESOURCE_TYPES.includes(t));
        if (b.inKindItems !== undefined) deal.inKindItems = parseInKind(b.inKindItems).map((i) => ({ ...i, status: 'PLEDGED', receivedAt: null }));
        if (b.tier !== undefined) {
          if (b.tier === null || b.tier === '') {
            deal.tier = null;
            deal.isCustomQuote = true;
          } else {
            const t = isId(b.tier) && (await SponsorshipTier.findOne({ _id: b.tier, opportunity: deal.opportunity._id, isActive: true }));
            if (!t) return fail(res, 400, 'That tier is not offered for this campaign');
            deal.tier = t._id;
            deal.isCustomQuote = !!b.isCustomQuote;
          }
        }
        deal.history.push({ stage: deal.stage, note: 'Sponsor updated the proposal', by: req.user._id });
        await notifyCampaignTeam(deal.opportunity, req.user._id, 'Proposal updated', `${deal.sponsor.name} updated their proposal for "${deal.opportunity.title}".`, link);
        break;
      }
      case 'SET_LOGO': {
        const u = optUrl(b.logoUrl);
        if (!u) return fail(res, 400, 'Logo must be an http(s) image link');
        if (u !== deal.logoUrl) {
          deal.logoUrl = u;
          deal.logoUsageApproved = false; // a new logo needs fresh approval
          deal.logoApprovedBy = null;
          deal.logoApprovedAt = null;
        }
        break;
      }
      case 'APPROVE_LOGO': {
        if (!deal.logoUrl) return fail(res, 400, 'Choose a logo first');
        deal.logoUsageApproved = true;
        deal.logoApprovedBy = req.user._id;
        deal.logoApprovedAt = new Date();
        deal.history.push({ stage: deal.stage, note: 'Sponsor approved use of their logo', by: req.user._id });
        break;
      }
      case 'REVOKE_LOGO': {
        deal.logoUsageApproved = false;
        deal.logoApprovedBy = null;
        deal.logoApprovedAt = null;
        deal.history.push({ stage: deal.stage, note: 'Sponsor withdrew logo approval', by: req.user._id });
        await notifyCampaignTeam(deal.opportunity, req.user._id, 'Logo approval withdrawn', `${deal.sponsor.name} withdrew approval to use their logo on "${deal.opportunity.title}".`, link);
        break;
      }
      case 'WITHDRAW': {
        if (!['APPLIED', 'IN_REVIEW', 'NEGOTIATING'].includes(deal.stage)) return fail(res, 400, 'An agreed deal cannot be withdrawn here. Message the Hateymalo team.');
        deal.stage = 'WITHDRAWN';
        deal.history.push({ stage: 'WITHDRAWN', note: str(b.note, 500) || 'Withdrawn by sponsor', by: req.user._id });
        await notifyCampaignTeam(deal.opportunity, req.user._id, 'Proposal withdrawn', `${deal.sponsor.name} withdrew from "${deal.opportunity.title}".`, link);
        break;
      }
      default:
        return fail(res, 400, 'Unknown action');
    }
    await deal.save();
    audit(req, `Sponsor ${b.action.toLowerCase().replace('_', ' ')} on deal for "${deal.opportunity.title}"`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: 'Saved', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/sponsorship/deals/:id/messages  { body, internal }
const postDealMessage = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.sponsor || !deal.opportunity) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    const staffSide = v.isManager || v.isOrganizer || v.isFinance || v.isBrand;
    if (!staffSide && !['OWNER', 'EDITOR'].includes(v.sponsorRole)) return fail(res, 403, 'You cannot message on this deal');
    const body = str(req.body?.body, 3000);
    if (!body) return fail(res, 400, 'Message is empty');
    const internal = staffSide && !!req.body?.internal;
    deal.messages.push({ author: req.user._id, authorSide: staffSide && !v.isSponsor ? 'HATEYMALO' : 'SPONSOR', body, internal });
    await deal.save();
    if (!internal) {
      if (staffSide && !v.isSponsor) {
        await notifySponsorMembers(deal.sponsor._id, req.user._id, 'New message from Hateymalo', `About "${deal.opportunity.title}": ${body.slice(0, 120)}`, `/sponsor/portal/deals/${deal._id}`);
      } else {
        await notifyCampaignTeam(deal.opportunity, req.user._id, `Message from ${deal.sponsor.name}`, body.slice(0, 140), `/admin?tab=sponsorDeals&deal=${deal._id}`);
      }
    }
    const fresh = await loadDeal(deal._id);
    res.status(201).json({ success: true, data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const TRANSITIONS = {
  APPLIED: ['IN_REVIEW', 'NEGOTIATING', 'AGREED', 'DECLINED'],
  IN_REVIEW: ['NEGOTIATING', 'AGREED', 'DECLINED'],
  NEGOTIATING: ['IN_REVIEW', 'AGREED', 'DECLINED'],
  AGREED: ['FULFILLED', 'CANCELLED', 'NEGOTIATING'],
  FULFILLED: ['AGREED'],
  DECLINED: ['IN_REVIEW'],
  WITHDRAWN: [],
  CANCELLED: ['IN_REVIEW'],
};
const MANAGER_ONLY_TARGETS = ['AGREED', 'FULFILLED', 'CANCELLED'];

// PUT /api/sponsorship/deals/:id/stage  { stage, note }
const changeDealStage = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity || !deal.sponsor) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    const to = req.body?.stage;
    if (!(TRANSITIONS[deal.stage] || []).includes(to)) return fail(res, 400, `A deal cannot move from ${deal.stage} to ${to || 'nothing'}`);
    if (MANAGER_ONLY_TARGETS.includes(to) ? !v.isManager : !(v.isManager || v.isOrganizer)) {
      return fail(res, 403, MANAGER_ONLY_TARGETS.includes(to) ? 'Only sponsorship managers can agree, complete or cancel deals' : 'Not allowed');
    }

    if (to === 'AGREED') {
      const inKindActive = deal.inKindItems.filter((i) => i.status !== 'CANCELLED').length;
      if (!deal.cashAmount && !inKindActive) return fail(res, 400, 'Set the agreed cash amount or in-kind items before agreeing the deal');
      if (deal.tier && deal.tier.slots > 0 && deal.stage !== 'FULFILLED') {
        const taken = (await takenByTier([deal.tier._id]))[String(deal.tier._id)] || 0;
        if (taken >= deal.tier.slots) return fail(res, 409, `All ${deal.tier.name} slots are already taken`);
      }
      if (!deal.deliverables.length) {
        const end = deal.opportunity.endDate || deal.opportunity.startDate;
        deal.deliverables = (deal.opportunity.deliverablesTemplate || []).map((t) => ({
          title: t.title,
          type: t.type,
          dueDate: end ? new Date(new Date(end).getTime() + (t.dueOffsetDays || 0) * 864e5) : null,
          status: 'PENDING',
        }));
      }
    }
    if (to === 'FULFILLED') {
      const open = deal.deliverables.filter((d) => !['DONE', 'WAIVED'].includes(d.status));
      if (open.length) return fail(res, 409, `${open.length} deliverable(s) are not done yet: ${open.map((d) => d.title).slice(0, 3).join(', ')}`);
    }

    const from = deal.stage;
    deal.stage = to;
    deal.history.push({ stage: to, note: str(req.body?.note, 500), by: req.user._id });
    await deal.save();
    audit(req, `Moved ${deal.sponsor.name} deal for "${deal.opportunity.title}" ${from} → ${to}`, 'SPONSORSHIP', deal._id, str(req.body?.note, 500));
    const words = { IN_REVIEW: 'is being reviewed', NEGOTIATING: 'is in discussion', AGREED: 'is agreed — thank you!', FULFILLED: 'is complete', DECLINED: 'was not accepted', CANCELLED: 'was cancelled' };
    await notifySponsorMembers(deal.sponsor._id, req.user._id, 'Sponsorship update', `Your sponsorship of "${deal.opportunity.title}" ${words[to] || `moved to ${to}`}.`, `/sponsor/portal/deals/${deal._id}`);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: `Deal moved to ${to.replace('_', ' ').toLowerCase()}`, data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/deals/:id  (managers: commercial terms)
const updateDealTerms = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity) return fail(res, 404, 'Deal not found');
    if (['WITHDRAWN', 'DECLINED', 'CANCELLED'].includes(deal.stage)) return fail(res, 400, 'Reopen the deal before changing its terms');
    const b = req.body || {};
    if (b.tier !== undefined) {
      if (!b.tier) deal.tier = null;
      else {
        const t = isId(b.tier) && (await SponsorshipTier.findOne({ _id: b.tier, opportunity: deal.opportunity._id }));
        if (!t) return fail(res, 400, 'That tier is not offered for this campaign');
        deal.tier = t._id;
      }
    }
    if (b.isCustomQuote !== undefined) deal.isCustomQuote = !!b.isCustomQuote;
    const oldCash = deal.cashAmount;
    if (b.cashAmount !== undefined) deal.cashAmount = int(b.cashAmount);
    if (b.inKindItems !== undefined) deal.inKindItems = parseInKind(b.inKindItems);
    if (b.agreement !== undefined) {
      const docUrl = optUrl(b.agreement?.documentUrl);
      if (docUrl === null) return fail(res, 400, 'Agreement document must be an http(s) link');
      const signedAt = optDate(b.agreement?.signedAt);
      if (signedAt === undefined) return fail(res, 400, 'Signed date is not valid');
      deal.agreement = { documentUrl: docUrl, terms: str(b.agreement?.terms, 4000), signedAt, signedByName: str(b.agreement?.signedByName, 120) };
    }
    if (b.showOnPublicPage !== undefined) deal.showOnPublicPage = !!b.showOnPublicPage;
    await deal.save();
    audit(req, `Updated terms for ${deal.sponsor?.name} on "${deal.opportunity.title}"${oldCash !== deal.cashAmount ? ` (cash Rs. ${oldCash} → Rs. ${deal.cashAmount})` : ''}`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: 'Terms saved', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const deliverableAccess = (v) => v.isManager || v.isOrganizer || v.isBrand;

// POST /api/sponsorship/deals/:id/deliverables  { title, type, dueDate }
const addDeliverable = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    if (!(v.isManager || v.isOrganizer)) return fail(res, 403, 'Not allowed');
    const title = str(req.body?.title, 200);
    if (!title) return fail(res, 400, 'Deliverable title is required');
    const dueDate = optDate(req.body?.dueDate);
    if (dueDate === undefined) return fail(res, 400, 'Due date is not valid');
    deal.deliverables.push({ title, type: pick(req.body?.type, DELIVERABLE_TYPES, 'OTHER'), dueDate, status: 'PENDING' });
    await deal.save();
    audit(req, `Added deliverable "${title}" for ${deal.sponsor?.name}`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.status(201).json({ success: true, data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/deals/:id/deliverables/:did  { status, proofUrls, proofNote, title, dueDate }
const updateDeliverable = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.did)) return fail(res, 404, 'Not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    if (!deliverableAccess(v)) return fail(res, 403, 'Not allowed');
    const item = deal.deliverables.id(req.params.did);
    if (!item) return fail(res, 404, 'Deliverable not found');
    const b = req.body || {};
    if (b.title !== undefined && str(b.title, 200)) item.title = str(b.title, 200);
    if (b.dueDate !== undefined) {
      const d = optDate(b.dueDate);
      if (d === undefined) return fail(res, 400, 'Due date is not valid');
      item.dueDate = d;
    }
    if (b.proofUrls !== undefined) {
      const urls = Array.isArray(b.proofUrls) ? b.proofUrls.slice(0, 20) : [];
      if (urls.some((u) => !isHttpUrl(u))) return fail(res, 400, 'Each proof must be an http(s) link');
      item.proofUrls = urls.map((u) => u.trim());
    }
    if (b.proofNote !== undefined) item.proofNote = str(b.proofNote, 1000);
    if (b.status !== undefined) {
      const status = pick(b.status, ['PENDING', 'IN_PROGRESS', 'DONE', 'WAIVED'], item.status);
      if (status === 'DONE' && !item.proofUrls.length && !item.proofNote) return fail(res, 400, 'Add a proof link or note before marking this done');
      if (status === 'WAIVED' && !v.isManager) return fail(res, 403, 'Only sponsorship managers can waive a deliverable');
      const becameDone = status === 'DONE' && item.status !== 'DONE';
      item.status = status;
      item.completedBy = ['DONE', 'WAIVED'].includes(status) ? req.user._id : null;
      item.completedAt = ['DONE', 'WAIVED'].includes(status) ? new Date() : null;
      if (becameDone) {
        await notifySponsorMembers(deal.sponsor._id, req.user._id, 'Deliverable completed', `"${item.title}" for "${deal.opportunity.title}" is done, with proof in your portal.`, `/sponsor/portal/deals/${deal._id}`);
      }
    }
    await deal.save();
    audit(req, `Deliverable "${item.title}" for ${deal.sponsor?.name}: ${item.status}`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: 'Deliverable saved', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/sponsorship/deals/:id/deliverables/:did  (managers)
const deleteDeliverable = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.did)) return fail(res, 404, 'Not found');
    const deal = await SponsorshipDeal.findById(req.params.id);
    if (!deal) return fail(res, 404, 'Deal not found');
    const item = deal.deliverables.id(req.params.did);
    if (!item) return fail(res, 404, 'Deliverable not found');
    item.deleteOne();
    await deal.save();
    audit(req, `Removed deliverable "${item.title}"`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/sponsorship/deals/:id/payments  (finance)  { amount, method, reference, receivedAt, note }
const recordPayment = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity) return fail(res, 404, 'Deal not found');
    if (!CONTRACTED_STAGES.includes(deal.stage)) return fail(res, 400, 'Payments can only be recorded on agreed deals');
    const amount = int(req.body?.amount);
    if (amount < 1) return fail(res, 400, 'Amount must be at least Rs. 1');
    const receivedAt = optDate(req.body?.receivedAt) || new Date();
    if (receivedAt > new Date(Date.now() + 864e5)) return fail(res, 400, 'Received date cannot be in the future');
    const reference = str(req.body?.reference, 120);
    const method = pick(req.body?.method, ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'], 'BANK_TRANSFER');
    if (method !== 'CASH' && !reference) return fail(res, 400, 'Add the bank or transaction reference');
    deal.payments.push({ amount, method, reference, receivedAt, note: str(req.body?.note, 300), recordedBy: req.user._id });
    await deal.save();
    audit(req, `Recorded payment Rs. ${amount} (${method}${reference ? ` ${reference}` : ''}) from ${deal.sponsor?.name}`, 'SPONSORSHIP', deal._id);
    await notifySponsorMembers(deal.sponsor._id, req.user._id, 'Payment received', `We received Rs. ${amount.toLocaleString('en-IN')} for "${deal.opportunity.title}". Thank you!`, `/sponsor/portal/deals/${deal._id}`);
    const fresh = await loadDeal(deal._id);
    res.status(201).json({ success: true, message: 'Payment recorded', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/sponsorship/deals/:id/payments/:pid  (finance)
const deletePayment = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.pid)) return fail(res, 404, 'Not found');
    const deal = await SponsorshipDeal.findById(req.params.id).populate('sponsor', 'name');
    if (!deal) return fail(res, 404, 'Deal not found');
    const p = deal.payments.id(req.params.pid);
    if (!p) return fail(res, 404, 'Payment not found');
    const desc = `Rs. ${p.amount} (${p.method}${p.reference ? ` ${p.reference}` : ''})`;
    p.deleteOne();
    await deal.save();
    audit(req, `Removed payment ${desc} from ${deal.sponsor?.name}`, 'SPONSORSHIP', deal._id, str(req.body?.reason || req.query?.reason, 300));
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: 'Payment removed', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/deals/:id/report  { summary, highlights, mediaUrls, share }
const updateDealReport = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Deal not found');
    const deal = await loadDeal(req.params.id);
    if (!deal || !deal.opportunity) return fail(res, 404, 'Deal not found');
    const v = viewerFor(deal, req.user);
    if (!(v.isManager || v.isOrganizer)) return fail(res, 403, 'Not allowed');
    if (!CONTRACTED_STAGES.includes(deal.stage)) return fail(res, 400, 'Reports are for agreed deals');
    const b = req.body || {};
    const urls = Array.isArray(b.mediaUrls) ? b.mediaUrls.slice(0, 40) : deal.report?.mediaUrls || [];
    if (urls.some((u) => !isHttpUrl(u))) return fail(res, 400, 'Each media item must be an http(s) link');
    deal.report = {
      summary: b.summary !== undefined ? str(b.summary, 8000) : deal.report?.summary || '',
      highlights: b.highlights !== undefined ? strList(b.highlights, 20, 300) : deal.report?.highlights || [],
      mediaUrls: urls.map((u) => u.trim()),
      sharedAt: deal.report?.sharedAt || null,
      sharedBy: deal.report?.sharedBy || null,
    };
    if (b.share) {
      if (!deal.report.summary) return fail(res, 400, 'Write the report summary before sharing it');
      deal.report.sharedAt = new Date();
      deal.report.sharedBy = req.user._id;
      await notifySponsorMembers(deal.sponsor._id, req.user._id, 'Your impact report is ready', `See what your sponsorship of "${deal.opportunity.title}" achieved.`, `/sponsor/portal/deals/${deal._id}`);
    }
    await deal.save();
    audit(req, `${b.share ? 'Shared' : 'Saved'} impact report for ${deal.sponsor?.name}`, 'SPONSORSHIP', deal._id);
    const fresh = await loadDeal(deal._id);
    res.json({ success: true, message: b.share ? 'Report shared with the sponsor' : 'Report saved', data: serializeDeal(fresh, viewerFor(fresh, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Brand kit                                                           */
/* ------------------------------------------------------------------ */

// `full` = brand staff / organisers. Sponsors previewing the kit never get
// another sponsor's logo link until that sponsor has approved its use.
const loadBrandKit = async (opp, full = true) => {
  const deals = await SponsorshipDeal.find({ opportunity: opp._id, stage: { $in: CONTRACTED_STAGES } })
    .populate('sponsor', 'name logos')
    .populate('tier', 'name level logoSize order');
  const kit = opp.brandKit?.toObject ? opp.brandKit.toObject() : opp.brandKit || {};
  const slots = (kit.slots || [])
    .map((s) => {
      const d = deals.find((x) => sameId(x._id, s.deal));
      if (!d) return null;
      return {
        ...s,
        sponsorName: d.sponsor?.name || '',
        logoUrl: d.logoUrl,
        logoUsageApproved: d.logoUsageApproved,
        tier: d.tier ? { name: d.tier.name, level: d.tier.level, logoSize: d.tier.logoSize } : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
  // Contracted sponsors not yet placed, so the editor can add them
  const unplaced = deals
    .filter((d) => !slots.some((s) => sameId(s.deal, d._id)))
    .map((d) => ({
      deal: d._id,
      sponsorName: d.sponsor?.name || '',
      logoUrl: d.logoUrl,
      logoUsageApproved: d.logoUsageApproved,
      tier: d.tier ? { name: d.tier.name, level: d.tier.level, logoSize: d.tier.logoSize, order: d.tier.order } : null,
    }));
  const hide = (s) => (full || s.logoUsageApproved ? s : { ...s, logoUrl: '' });
  return {
    ...kit,
    slots: slots.map(hide),
    unplaced: full ? unplaced : [],
    opportunity: { _id: opp._id, title: opp.title, startDate: opp.startDate, location: opp.location },
  };
};

// GET /api/sponsorship/opportunities/:id/brand-kit
const getBrandKit = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id);
    if (!opp) return fail(res, 404, 'Opportunity not found');
    const staff = canBrand(req.user) || isOrganizerOf(opp, req.user);
    let allowed = staff;
    if (!allowed) {
      const ids = await myAccountIds(req.user);
      allowed = !!(await SponsorshipDeal.exists({ opportunity: opp._id, sponsor: { $in: ids }, stage: { $in: CONTRACTED_STAGES } }));
    }
    if (!allowed) return fail(res, 403, 'Not allowed');
    res.json({ success: true, data: await loadBrandKit(opp, staff) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/sponsorship/opportunities/:id/brand-kit  { campaignLabel, accentColor, slots, notes, approve }
const updateBrandKit = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Opportunity not found');
    const opp = await SponsorshipOpportunity.findById(req.params.id);
    if (!opp) return fail(res, 404, 'Opportunity not found');
    if (!canBrand(req.user) && !isOrganizerOf(opp, req.user)) return fail(res, 403, 'Not allowed');
    const b = req.body || {};
    const kit = opp.brandKit || {};
    if (b.campaignLabel !== undefined) kit.campaignLabel = str(b.campaignLabel, 60);
    if (b.accentColor !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(b.accentColor || '')) return fail(res, 400, 'Accent colour must look like #B5232C');
      kit.accentColor = b.accentColor;
    }
    if (b.notes !== undefined) kit.notes = str(b.notes, 1000);
    if (b.slots !== undefined) {
      if (!Array.isArray(b.slots)) return fail(res, 400, 'Slots must be a list');
      const contracted = await SponsorshipDeal.find({ opportunity: opp._id, stage: { $in: CONTRACTED_STAGES } }).select('_id');
      const ok = new Set(contracted.map((d) => String(d._id)));
      const slots = [];
      for (const s of b.slots.slice(0, 40)) {
        if (!isId(s?.deal) || !ok.has(String(s.deal))) return fail(res, 400, 'Only agreed sponsors of this campaign can be placed');
        if (slots.some((x) => sameId(x.deal, s.deal))) continue;
        slots.push({
          deal: s.deal,
          order: Math.round(Number(s.order) || slots.length),
          size: pick(s.size, ['XL', 'L', 'M', 'S'], 'M'),
          placements: Array.isArray(s.placements) ? [...new Set(s.placements.filter((p) => BRAND_PLACEMENTS.includes(p)))] : [],
        });
      }
      kit.slots = slots;
    }
    // Any change clears the previous sign-off; `approve` signs off the current layout
    kit.approvedBy = b.approve ? req.user._id : null;
    kit.approvedAt = b.approve ? new Date() : null;
    opp.brandKit = kit;
    await opp.save();
    audit(req, `${b.approve ? 'Approved' : 'Updated'} brand kit for "${opp.title}"`, 'SPONSORSHIP', opp._id);
    res.json({ success: true, message: b.approve ? 'Brand kit approved' : 'Brand kit saved', data: await loadBrandKit(opp) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Summary for the admin dashboard                                     */
/* ------------------------------------------------------------------ */

// GET /api/sponsorship/admin/summary
const adminSummary = async (req, res) => {
  try {
    const manager = canManage(req.user);
    const finance = canFinance(req.user);
    if (!manager && !finance) return fail(res, 403, 'Not allowed');
    const [oppCounts, stageRows, money, inKind, pendingAccounts] = await Promise.all([
      SponsorshipOpportunity.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      SponsorshipDeal.aggregate([{ $group: { _id: '$stage', n: { $sum: 1 }, projected: { $sum: '$proposal.amount' } } }]),
      SponsorshipDeal.aggregate([
        { $match: { stage: { $in: CONTRACTED_STAGES } } },
        { $group: { _id: null, contracted: { $sum: '$cashAmount' }, received: { $sum: { $sum: '$payments.amount' } } } },
      ]),
      SponsorshipDeal.aggregate([
        { $match: { stage: { $in: CONTRACTED_STAGES } } },
        { $unwind: '$inKindItems' },
        { $match: { 'inKindItems.status': { $ne: 'CANCELLED' } } },
        { $group: { _id: '$inKindItems.status', value: { $sum: '$inKindItems.estimatedValue' }, items: { $sum: 1 } } },
      ]),
      SponsorAccount.countDocuments({ verificationStatus: 'PENDING' }),
    ]);
    const m = money[0] || { contracted: 0, received: 0 };
    res.json({
      success: true,
      data: {
        opportunities: Object.fromEntries(oppCounts.map((r) => [r._id, r.n])),
        pipeline: stageRows.map((r) => ({ stage: r._id, deals: r.n, projected: r.projected })),
        contractedCash: m.contracted,
        ...(finance ? { receivedCash: m.received, outstandingCash: Math.max(0, m.contracted - m.received) } : {}),
        inKind: {
          pledgedValue: inKind.find((r) => r._id === 'PLEDGED')?.value || 0,
          receivedValue: inKind.find((r) => r._id === 'RECEIVED')?.value || 0,
          items: inKind.reduce((s, r) => s + r.items, 0),
          note: 'Estimated values of in-kind contributions; not cash revenue.',
        },
        pendingSponsorAccounts: pendingAccounts,
      },
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

module.exports = {
  listPublicOpportunities,
  getPublicOpportunity,
  createAccount,
  myAccounts,
  getAccount,
  updateAccount,
  addAccountMember,
  removeAccountMember,
  adminListAccounts,
  verifyAccount,
  adminListOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  listTiers,
  createTier,
  updateTier,
  deleteTier,
  applyToOpportunity,
  myDeals,
  adminListDeals,
  getDeal,
  sponsorUpdateDeal,
  postDealMessage,
  changeDealStage,
  updateDealTerms,
  addDeliverable,
  updateDeliverable,
  deleteDeliverable,
  recordPayment,
  deletePayment,
  updateDealReport,
  getBrandKit,
  updateBrandKit,
  adminSummary,
};
