// Ad campaign money (whole NPR), shared by the ads controller and the revenue
// ledger so both always use the same formula.

const LIVE_OR_DONE = ['APPROVED', 'PAUSED', 'ENDED', 'ARCHIVED'];

// Earned to date, from valid-traffic totals
const spendOf = (c) => {
  const t = c.totals || {};
  if (c.pricingModel === 'FLAT') return c.startDate && new Date(c.startDate) <= new Date() && LIVE_OR_DONE.includes(c.status) ? c.flatPrice || 0 : 0;
  const raw = c.pricingModel === 'CPM' ? Math.floor(((t.impressions || 0) * (c.rate || 0)) / 1000) : (t.clicks || 0) * (c.rate || 0);
  return c.budget > 0 ? Math.min(raw, c.budget) : raw;
};

// What the advertiser committed to for the whole run
const bookedValueOf = (c) => (c.pricingModel === 'FLAT' ? c.flatPrice || 0 : c.budget || 0);

const budgetSpent = (c) => c.pricingModel !== 'FLAT' && c.budget > 0 && spendOf(c) >= c.budget;

const wasApproved = (c) => !!c.reviewedAt && (c.history || []).some((h) => h.status === 'APPROVED');

// Contracted value for the ledger: the booking while it runs; once it has
// ended, a CPM/CPC campaign is worth what it actually delivered.
const contractedValueOf = (c) => {
  if (['APPROVED', 'PAUSED'].includes(c.status)) return bookedValueOf(c);
  if (['ENDED', 'ARCHIVED'].includes(c.status) && wasApproved(c)) return c.pricingModel === 'FLAT' ? c.flatPrice || 0 : spendOf(c);
  return 0;
};

module.exports = { spendOf, bookedValueOf, budgetSpent, contractedValueOf };
