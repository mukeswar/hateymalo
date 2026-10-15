const LedgerEntry = require('../models/LedgerEntry');
const { contractedValueOf } = require('./adMoney');

// Helpers that write the revenue ledger. Every writer goes through here so the
// rules stay in one place: rows are never edited, corrections are reversals,
// and contracted value is kept in step with the source record by posting the
// difference ("sync"), which makes repeated syncs harmless.

const CONTRACTED_DEAL_STAGES = ['AGREED', 'FULFILLED'];
const toPaisa = (npr) => Math.round(Number(npr || 0) * 100);

const postEntry = (fields) => LedgerEntry.create(fields);

// Posts the opposite of `entry` and marks it reversed. Returns the reversal row.
const reverseEntry = async (entry, { user = null, note = '' } = {}) => {
  if (entry.reversed || entry.reversalOf) return null;
  const rev = await LedgerEntry.create({
    date: new Date(),
    source: entry.source,
    stage: entry.stage,
    amountPaisa: -entry.amountPaisa,
    vatPaisa: -(entry.vatPaisa || 0),
    description: `Reversal: ${entry.description}`.slice(0, 300),
    sponsorAccount: entry.sponsorAccount,
    deal: entry.deal,
    adCampaign: entry.adCampaign,
    invoice: entry.invoice,
    payment: entry.payment,
    method: entry.method,
    reference: entry.reference,
    origin: entry.origin,
    reversalOf: entry._id,
    note,
    createdBy: user?._id || null,
  });
  entry.reversed = true;
  await entry.save();
  return rev;
};

const sumPaisa = async (match) => {
  const [r] = await LedgerEntry.aggregate([{ $match: match }, { $group: { _id: null, t: { $sum: '$amountPaisa' } } }]);
  return r?.t || 0;
};

// Keep the CONTRACTED rows for a sponsorship deal equal to its agreed cash
const syncDealContracted = async (deal, user = null, title = '') => {
  const target = CONTRACTED_DEAL_STAGES.includes(deal.stage) ? toPaisa(deal.cashAmount) : 0;
  const current = await sumPaisa({ deal: deal._id, stage: 'CONTRACTED' });
  if (target === current) return null;
  const name = title || deal.opportunity?.title || 'sponsorship';
  return postEntry({
    source: 'SPONSORSHIP',
    stage: 'CONTRACTED',
    amountPaisa: target - current,
    description: current === 0 ? `Deal agreed: ${name}` : target === 0 ? `Deal no longer contracted (${deal.stage.toLowerCase()}): ${name}` : `Deal value changed: ${name}`,
    sponsorAccount: deal.sponsor?._id || deal.sponsor,
    deal: deal._id,
    createdBy: user?._id || null,
  });
};

// Keep the CONTRACTED rows for an ad campaign equal to its booking / delivered value
const syncCampaignContracted = async (campaign, user = null) => {
  const target = toPaisa(contractedValueOf(campaign));
  const current = await sumPaisa({ adCampaign: campaign._id, stage: 'CONTRACTED' });
  if (target === current) return null;
  return postEntry({
    source: 'ADVERTISING',
    stage: 'CONTRACTED',
    amountPaisa: target - current,
    description: current === 0 ? `Ad campaign booked: ${campaign.title}` : target === 0 ? `Ad campaign no longer booked: ${campaign.title}` : `Ad campaign value changed: ${campaign.title}`,
    sponsorAccount: campaign.advertiser?._id || campaign.advertiser,
    adCampaign: campaign._id,
    createdBy: user?._id || null,
  });
};

// Catches changes that happened without a request handler (campaigns that
// ended by date, CPM spend growing). Throttled per serverless instance.
let lastFullSync = 0;
const syncAllContracted = async ({ force = false } = {}) => {
  if (!force && Date.now() - lastFullSync < 60 * 1000) return;
  lastFullSync = Date.now();
  const SponsorshipDeal = require('../models/SponsorshipDeal');
  const AdCampaign = require('../models/AdCampaign');
  const dealIdsWithRows = await LedgerEntry.distinct('deal', { stage: 'CONTRACTED', deal: { $ne: null } });
  const deals = await SponsorshipDeal.find({ $or: [{ stage: { $in: CONTRACTED_DEAL_STAGES } }, { _id: { $in: dealIdsWithRows } }] })
    .select('stage cashAmount sponsor opportunity')
    .populate('opportunity', 'title');
  for (const d of deals) await syncDealContracted(d);
  const campaigns = await AdCampaign.find({ status: { $in: ['APPROVED', 'PAUSED', 'ENDED', 'ARCHIVED'] } }).select('title status pricingModel flatPrice rate budget totals startDate reviewedAt history advertiser');
  for (const c of campaigns) await syncCampaignContracted(c);
};

// Nepali fiscal year label (Bikram Sambat), e.g. "2083/84" for 17 Jul 2026 – 16 Jul 2027.
// BS years start in mid-April, so the BS year of 1 Shrawan is the AD year + 57.
const fiscalYearOf = (date, fyStart = '07-17') => {
  const d = new Date(date);
  // Nepal time (UTC+5:45) so an invoice issued late on 16 July Nepal time is not pushed into the next year
  const np = new Date(d.getTime() + 345 * 60 * 1000);
  const [m, day] = fyStart.split('-').map(Number);
  const y = np.getUTCFullYear();
  const startedThisYear = np.getUTCMonth() + 1 > m || (np.getUTCMonth() + 1 === m && np.getUTCDate() >= day);
  const bsStart = (startedThisYear ? y : y - 1) + 57;
  return `${bsStart}/${String((bsStart + 1) % 100).padStart(2, '0')}`;
};

module.exports = { toPaisa, postEntry, reverseEntry, sumPaisa, syncDealContracted, syncCampaignContracted, syncAllContracted, fiscalYearOf };
