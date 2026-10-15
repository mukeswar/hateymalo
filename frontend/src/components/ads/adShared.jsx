/* --------------------------------------------------------------------------
   Advertising vocabulary shared by the advertiser portal and the admin tabs.
   Contract: docs/ADS.md. The server enforces every rule; these only decide
   what to show.
   -------------------------------------------------------------------------- */

export const AD_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED', 'ENDED', 'ARCHIVED'];
export const OBJECTIVES = ['AWARENESS', 'TRAFFIC', 'VOLUNTEERS', 'DONATIONS', 'EVENT_PROMOTION', 'OTHER'];
export const PRICING_MODELS = ['FLAT', 'CPM', 'CPC'];
export const AD_FORMATS = ['IMAGE', 'NATIVE', 'VIDEO'];
export const SURFACES = ['WEB', 'APP'];
export const CTAS = ['LEARN_MORE', 'VISIT', 'SIGN_UP', 'DONATE', 'VOLUNTEER', 'SHOP', 'CONTACT', 'WATCH'];
export const AD_LABELS = ['Sponsored', 'Advertisement', 'Promoted', 'प्रायोजित'];
export const MAX_CREATIVES = 10;

export const CTA_LABELS = {
  LEARN_MORE: 'Learn more',
  VISIT: 'Visit',
  SIGN_UP: 'Sign up',
  DONATE: 'Donate',
  VOLUNTEER: 'Volunteer',
  SHOP: 'Shop now',
  CONTACT: 'Contact us',
  WATCH: 'Watch',
};

export const OBJECTIVE_LABELS = {
  AWARENESS: 'Awareness',
  TRAFFIC: 'Website visits',
  VOLUNTEERS: 'Find volunteers',
  DONATIONS: 'Donations',
  EVENT_PROMOTION: 'Promote an event',
  OTHER: 'Other',
};

export const FORMAT_LABELS = { IMAGE: 'Image', NATIVE: 'Sponsored card', VIDEO: 'Video' };
export const SURFACE_LABELS = { WEB: 'Website', APP: 'Mobile app' };
export const PRICING_LABELS = {
  FLAT: { label: 'Flat price', hint: 'One price for the whole run, from each placement’s daily rate.' },
  CPM: { label: 'Per 1,000 impressions (CPM)', hint: 'Pay for ads that actually appeared on screen, up to your budget.' },
  CPC: { label: 'Per click (CPC)', hint: 'Pay only when someone clicks, up to your budget.' },
};

// deliveryStatus is the main badge (APPROVED is split into SCHEDULED / LIVE / ...)
export const DELIVERY = {
  DRAFT: { label: 'Draft', cls: 'bg-paper-deep text-ink-soft', hint: 'Not submitted yet. Only your team can see it.' },
  IN_REVIEW: { label: 'In review', cls: 'bg-marigold-tint text-marigold-text', hint: 'Our team is checking the ad. This usually takes up to two working days.' },
  APPROVED: { label: 'Approved', cls: 'bg-pine-tint text-pine', hint: '' },
  SCHEDULED: { label: 'Scheduled', cls: 'bg-sky-tint text-sky-ink', hint: 'Approved. It starts showing on the start date.' },
  LIVE: { label: 'Live', cls: 'bg-pine text-white', hint: 'Showing now.' },
  FINISHED: { label: 'Finished', cls: 'bg-paper-deep text-ink-soft', hint: 'The end date has passed.' },
  BUDGET_SPENT: { label: 'Budget spent', cls: 'bg-marigold-tint text-marigold-text', hint: 'The budget is used up, so the ad stopped showing.' },
  NO_CREATIVE: { label: 'No approved creative', cls: 'bg-brand-tint text-brand', hint: 'No approved, active creative is left, so nothing can show.' },
  REJECTED: { label: 'Needs changes', cls: 'bg-brand-tint text-brand', hint: 'Not approved. Read the reasons, edit and submit again.' },
  PAUSED: { label: 'Paused', cls: 'bg-marigold-tint text-marigold-text', hint: 'Not showing until it is resumed.' },
  ENDED: { label: 'Ended', cls: 'bg-paper-deep text-ink-soft', hint: 'This campaign has ended and can no longer be changed.' },
  ARCHIVED: { label: 'Archived', cls: 'bg-paper-deep text-muted', hint: 'Archived.' },
};

export const CREATIVE_STATUS = {
  PENDING: { label: 'Waiting for review', cls: 'bg-marigold-tint text-marigold-text' },
  APPROVED: { label: 'Approved', cls: 'bg-pine-tint text-pine' },
  REJECTED: { label: 'Rejected', cls: 'bg-brand-tint text-brand' },
};

export const AdChip = ({ map = DELIVERY, value, className = '' }) => {
  const s = map[value] || { label: value, cls: 'bg-paper-deep text-ink-soft' };
  return <span className={`chip ${s.cls} ${className}`}>{s.label}</span>;
};

export const num = (n) => Number(n || 0).toLocaleString('en-IN');
export const pct = (n) => `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
export const nprAd = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// What the advertiser pays, in words
export const priceLine = (c) => {
  if (!c) return '';
  if (c.pricingModel === 'FLAT') return c.flatPrice ? `${nprAd(c.flatPrice)} flat for the whole run` : 'Quote appears once placements and dates are set';
  const unit = c.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click';
  return c.rate ? `${nprAd(c.rate)} ${unit} · budget ${nprAd(c.budget)}` : 'Quote appears once placements are set';
};

// Which advertiser actions apply in each stored status (server rules, docs/ADS.md)
export const advertiserActions = (c) => {
  const v = c?.viewer || {};
  if (!v.canEdit && !v.canManage && !v.canReview) return [];
  const s = c.status;
  const out = [];
  if (['DRAFT', 'REJECTED'].includes(s) && (v.canEdit || v.canManage)) out.push('SUBMIT');
  if (s === 'IN_REVIEW' && (v.canEdit || v.canManage)) out.push('WITHDRAW');
  if (s === 'APPROVED') out.push('PAUSE');
  if (s === 'PAUSED' && (!c.pausedByStaff || v.canReview)) out.push('RESUME');
  if (['APPROVED', 'PAUSED'].includes(s)) out.push('END');
  if (['DRAFT', 'REJECTED', 'ENDED'].includes(s)) out.push('ARCHIVE');
  if (['DRAFT', 'REJECTED'].includes(s) && (v.canEdit || v.canManage)) out.push('DELETE');
  return out;
};

export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const emptyCreative = (format = 'NATIVE') => ({
  name: '',
  format,
  imageUrl: '',
  videoUrl: '',
  posterUrl: '',
  headline: '',
  body: '',
  cta: 'LEARN_MORE',
  altText: '',
  skipAfterSeconds: 5,
  labelText: 'Sponsored',
  isActive: true,
});

// A creative shaped like a served ad, for previews (no token, no tracking)
export const previewAd = (k, advertiserName = '') => ({
  token: '',
  campaignId: 'preview',
  creativeId: k._id || 'preview',
  format: k.format,
  imageUrl: k.imageUrl,
  videoUrl: k.videoUrl,
  posterUrl: k.posterUrl,
  headline: k.headline,
  body: k.body,
  cta: k.cta,
  ctaLabel: CTA_LABELS[k.cta] || 'Learn more',
  altText: k.altText,
  labelText: k.labelText || 'Sponsored',
  skipAfterSeconds: k.skipAfterSeconds,
  advertiserName,
  frequencyCapPerDay: 0,
  clickPath: '',
});

// Fetch a report CSV with the auth header (the axios instance adds it) and save it
export const downloadReportCsv = async (API, id, range, fallbackName = 'ad-report') => {
  const res = await API.get(`/ads/campaigns/${id}/report`, { params: { ...range, format: 'csv' }, responseType: 'blob' });
  const cd = res.headers?.['content-disposition'] || '';
  const name = /filename="([^"]+)"/.exec(cd)?.[1] || `${fallbackName}.csv`;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
