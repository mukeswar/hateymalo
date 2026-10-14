import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ImageOff, SearchX, ArrowLeft, Plus, Trash2 } from 'lucide-react';

// Shared vocabulary, formatters and small building blocks for the sponsor
// pages (/sponsor, /sponsor/opportunities/:id, /sponsor/portal/...).
// Sponsorship is about funding and visibility for campaigns; nothing here is
// used for community help requests.

export const npr = (n) => `रु ${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', opts);
};

export const fmtDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const dateRange = (a, b) => {
  const s = fmtDate(a);
  const e = fmtDate(b);
  if (s && e && s !== e) return `${s} – ${e}`;
  return s || e || '';
};

export const errMsg = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || fallback;

// Only http(s) links are ever rendered as images or hrefs.
export const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
export const safeUrl = (v) => (isHttpUrl(v) ? v.trim() : '');

export const sameId = (a, b) => String(a?._id || a || '') === String(b?._id || b || '');

export const CAMPAIGN_TYPES = {
  CLEANUP: 'Clean-up',
  BLOOD_DONATION: 'Blood donation',
  TREE_PLANTATION: 'Tree plantation',
  EDUCATION: 'Education',
  DISASTER_RELIEF: 'Disaster relief',
  FOOD_DISTRIBUTION: 'Food distribution',
  HEALTH: 'Health',
  OTHER: 'Other',
};

export const RESOURCE_TYPES = {
  CASH: 'Cash',
  MATERIALS: 'Materials',
  EQUIPMENT: 'Equipment',
  TRANSPORT: 'Transport',
  FOOD: 'Food',
  UNIFORMS: 'Uniforms',
  VENUE: 'Venue',
  MEDIA: 'Media',
  OTHER: 'Other',
};
export const IN_KIND_TYPES = Object.fromEntries(Object.entries(RESOURCE_TYPES).filter(([k]) => k !== 'CASH'));

export const VALUATION_METHODS = {
  SPONSOR_INVOICE: 'Sponsor invoice',
  MARKET_QUOTE: 'Market quote',
  SPONSOR_DECLARED: 'Declared by sponsor',
  STAFF_ESTIMATE: 'Staff estimate',
  NOT_VALUED: 'Not valued',
};

export const ACCOUNT_TYPES = {
  COMPANY: 'Company',
  NGO: 'NGO',
  LOCAL_BUSINESS: 'Local business',
  EDUCATION: 'Education',
  GOVERNMENT: 'Government',
  MEDIA: 'Media',
  INDIVIDUAL: 'Individual',
  OTHER: 'Other',
};

export const TIER_LEVELS = {
  TITLE: { label: 'Title', cls: 'bg-ink text-white' },
  GOLD: { label: 'Gold', cls: 'bg-marigold-tint text-marigold-text' },
  SILVER: { label: 'Silver', cls: 'bg-[#EEF0F2] text-[#4A5560]' },
  BRONZE: { label: 'Bronze', cls: 'bg-[#F6E7DC] text-[#8A4B22]' },
  COMMUNITY_PARTNER: { label: 'Community partner', cls: 'bg-pine-tint text-pine' },
  MEDIA_PARTNER: { label: 'Media partner', cls: 'bg-sky-tint text-sky-ink' },
  IN_KIND: { label: 'In-kind', cls: 'bg-paper-deep text-ink-soft' },
  CUSTOM: { label: 'Custom', cls: 'bg-brand-tint text-brand' },
};

export const LOGO_SIZES = { XL: 'Extra-large logo', L: 'Large logo', M: 'Medium logo', S: 'Small logo', NONE: 'Name credit only' };

export const DELIVERABLE_TYPES = {
  VEST_LOGO: 'Logo on volunteer vests',
  VENUE_BANNER: 'Venue banner',
  BACKDROP: 'Stage backdrop',
  ID_CARD: 'Volunteer ID cards',
  SOCIAL_MENTION: 'Social media mention',
  VIDEO: 'Video',
  PHOTO_ALBUM: 'Photo album',
  WEBSITE_LISTING: 'Website listing',
  SPEAKING_SLOT: 'Speaking slot',
  IMPACT_REPORT: 'Impact report',
  OTHER: 'Other',
};

export const DELIVERABLE_STATUS = {
  PENDING: { label: 'Pending', cls: 'bg-paper-deep text-ink-soft' },
  IN_PROGRESS: { label: 'In progress', cls: 'bg-sky-tint text-sky-ink' },
  DONE: { label: 'Done', cls: 'bg-pine-tint text-pine' },
  WAIVED: { label: 'Waived', cls: 'bg-[#EEF0F2] text-[#4A5560]' },
};

export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'Bank transfer',
  CONNECTIPS: 'connectIPS',
  KHALTI: 'Khalti',
  ESEWA: 'eSewa',
  CHEQUE: 'Cheque',
  CASH: 'Cash',
  OTHER: 'Other',
};

export const STAGES = {
  APPLIED: { label: 'Proposal sent', cls: 'bg-sky-tint text-sky-ink', next: 'The Hateymalo team will review your proposal and reply in the message thread.' },
  IN_REVIEW: { label: 'In review', cls: 'bg-marigold-tint text-marigold-text', next: 'Your proposal is being reviewed. Watch the message thread for questions.' },
  NEGOTIATING: { label: 'Negotiating', cls: 'bg-marigold-tint text-marigold-text', next: 'Terms are being discussed. Reply to messages and update your proposal if needed.' },
  AGREED: { label: 'Agreed', cls: 'bg-pine-tint text-pine', next: 'Confirmed. Choose and approve your logo, then follow deliverables and payments here.' },
  FULFILLED: { label: 'Fulfilled', cls: 'bg-pine text-white', next: 'All deliverables are complete. Thank you for backing this campaign.' },
  DECLINED: { label: 'Declined', cls: 'bg-brand-tint text-brand', next: 'This proposal was not accepted. You can still message the team.' },
  WITHDRAWN: { label: 'Withdrawn', cls: 'bg-paper-deep text-muted', next: 'You withdrew this proposal. You can apply again from the campaign page.' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-paper-deep text-muted', next: 'This sponsorship was cancelled. Message the team if you have questions.' },
};
export const STAGE_ORDER = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED', 'FULFILLED'];
export const EDITABLE_STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'];
export const CONTRACTED_STAGES = ['AGREED', 'FULFILLED'];

export const VERIFICATION = {
  PENDING: { label: 'Verification pending', cls: 'bg-marigold-tint text-marigold-text' },
  VERIFIED: { label: 'Verified', cls: 'bg-pine-tint text-pine' },
  REJECTED: { label: 'Not approved', cls: 'bg-brand-tint text-brand' },
};

export const OPP_STATUS = {
  DRAFT: { label: 'Draft — not public', cls: 'bg-ink text-white' },
  OPEN: { label: 'Open to sponsors', cls: 'bg-pine-tint text-pine' },
  CLOSED: { label: 'Sponsorship closed', cls: 'bg-paper-deep text-ink-soft' },
  COMPLETED: { label: 'Completed', cls: 'bg-sky-tint text-sky-ink' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-brand-tint text-brand' },
};

export const Chip = ({ map, value, className = '' }) => {
  const s = map[value] || { label: value, cls: 'bg-paper-deep text-ink-soft' };
  return <span className={`chip ${s.cls} ${className}`}>{s.label}</span>;
};

export const SectionTitle = ({ eyebrow, title, children, id, as: Tag = 'h2' }) => (
  <div className="space-y-1.5 mb-5">
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <Tag id={id} className="text-2xl font-bold text-ink leading-tight">{title}</Tag>
    {children && <p className="text-muted text-sm">{children}</p>}
  </div>
);

// Shows a logo from a URL; falls back to an initials tile when missing/broken.
export const LogoTile = ({ url, name = '', className = 'w-16 h-16', dark = false }) => {
  const [failed, setFailed] = useState(false);
  const src = safeUrl(url);
  useEffect(() => setFailed(false), [src]);
  const base = `${className} rounded-2xl border flex items-center justify-center overflow-hidden shrink-0 ${dark ? 'bg-night border-white/10' : 'bg-white border-sand'}`;
  if (src && !failed) {
    return (
      <span className={base}>
        <img src={src} alt={name ? `${name} logo` : 'Logo'} loading="lazy" onError={() => setFailed(true)} className="max-w-[82%] max-h-[82%] object-contain" />
      </span>
    );
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className={`${base} font-display font-bold text-ink-soft`} aria-label={name || 'No logo'} role="img">
      {initials || <ImageOff className="w-5 h-5 text-muted" aria-hidden="true" />}
    </span>
  );
};

// URL input with a live preview for logo / image links
export const UrlPreviewField = ({ id, label, value, onChange, placeholder = 'https://…', hint, preview = true, name }) => {
  const invalid = value && !isHttpUrl(value);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="flex items-start gap-3">
        {preview && <LogoTile url={value} name={name} className="w-12 h-12" />}
        <div className="flex-1 min-w-0">
          <input
            id={id}
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-hint`}
            className={`field ${invalid ? '!border-brand' : ''}`}
          />
          <p id={`${id}-hint`} className={`text-xs mt-1 ${invalid ? 'text-brand' : 'text-muted'}`}>
            {invalid ? 'Use a full link that starts with http:// or https://' : hint || 'Paste a link to an image (PNG, SVG or JPG).'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const Modal = ({ open, onClose, labelledBy, children, wide = false }) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector('input, select, textarea, button:not([data-close])')?.focus(), 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm animate-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`card !rounded-t-3xl !rounded-b-none sm:!rounded-3xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto relative animate-pop`}
      >
        <button
          type="button"
          data-close
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
};

export const PageSkeleton = ({ label = 'Loading' }) => (
  <div className="container-page pt-8 pb-20 space-y-6" aria-busy="true" aria-label={label}>
    <div className="h-5 w-40 bg-paper-deep animate-pulse rounded-full" />
    <div className="h-56 sm:h-72 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
      <div className="h-80 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
    </div>
  </div>
);

export const NotFoundCard = ({ title, body, to, cta }) => (
  <div className="container-page py-20">
    <div className="card max-w-md mx-auto p-10 text-center space-y-4">
      <span className="mx-auto w-14 h-14 rounded-full bg-paper-deep flex items-center justify-center">
        <SearchX className="w-6 h-6 text-muted" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="text-muted">{body}</p>
      <Link to={to} className="btn btn-primary">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {cta}
      </Link>
    </div>
  </div>
);

export const BackLink = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink transition-colors rounded-full">
    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {children}
  </Link>
);

// Multi-select chips for contribution types
export const TypeToggles = ({ value = [], onChange, options = RESOURCE_TYPES, legend }) => (
  <fieldset>
    {legend && <legend className="field-label">{legend}</legend>}
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, label]) => {
        const on = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== k) : [...value, k])}
            className={`chip !py-1.5 !px-3.5 border transition-colors ${on ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  </fieldset>
);

export const emptyInKind = () => ({ type: 'MATERIALS', description: '', quantity: '', unit: '', estimatedValue: '', valuationMethod: 'SPONSOR_DECLARED' });

export const cleanInKind = (items) =>
  items
    .filter((i) => i.description.trim())
    .map((i) => ({
      type: i.type,
      description: i.description.trim(),
      quantity: Number(i.quantity) || 0,
      unit: (i.unit || '').trim(),
      estimatedValue: Number(i.estimatedValue) || 0,
      valuationMethod: i.valuationMethod,
    }));

// Editable list of in-kind items (goods or services instead of cash)
export const InKindEditor = ({ items, onChange, idPrefix = 'ik' }) => {
  const set = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="surface-sunken p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">In-kind item {idx + 1}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-brand hover:bg-brand-tint"
              aria-label={`Remove in-kind item ${idx + 1}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor={`${idPrefix}-type-${idx}`} className="field-label">Type</label>
              <select id={`${idPrefix}-type-${idx}`} className="field" value={it.type} onChange={(e) => set(idx, { type: e.target.value })}>
                {Object.entries(IN_KIND_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${idPrefix}-desc-${idx}`} className="field-label">Description</label>
              <input id={`${idPrefix}-desc-${idx}`} className="field" value={it.description} maxLength={300} onChange={(e) => set(idx, { description: e.target.value })} placeholder="e.g. Drinking water, 500 ml bottles" />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-qty-${idx}`} className="field-label">Quantity</label>
              <input id={`${idPrefix}-qty-${idx}`} className="field" type="number" min="0" inputMode="numeric" value={it.quantity} onChange={(e) => set(idx, { quantity: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-unit-${idx}`} className="field-label">Unit</label>
              <input id={`${idPrefix}-unit-${idx}`} className="field" value={it.unit} maxLength={30} onChange={(e) => set(idx, { unit: e.target.value })} placeholder="bottles, kg, trips…" />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-val-${idx}`} className="field-label">Estimated value (NPR)</label>
              <input id={`${idPrefix}-val-${idx}`} className="field" type="number" min="0" inputMode="numeric" value={it.estimatedValue} onChange={(e) => set(idx, { estimatedValue: e.target.value })} aria-describedby={`${idPrefix}-valhint-${idx}`} />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor={`${idPrefix}-meth-${idx}`} className="field-label">How was it valued?</label>
              <select id={`${idPrefix}-meth-${idx}`} className="field" value={it.valuationMethod} onChange={(e) => set(idx, { valuationMethod: e.target.value })}>
                {Object.entries(VALUATION_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <p id={`${idPrefix}-valhint-${idx}`} className="text-xs text-muted mt-1">Estimated value — not cash. In-kind support is reported separately from cash.</p>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, emptyInKind()])} className="btn btn-ghost btn-sm">
        <Plus className="w-4 h-4" aria-hidden="true" /> Add in-kind item
      </button>
    </div>
  );
};

// Read-only in-kind list (values labelled as estimates, never cash)
export const InKindList = ({ items = [] }) => {
  if (!items.length) return <p className="text-sm text-muted">No in-kind items.</p>;
  return (
    <ul className="divide-y divide-sand rounded-2xl border border-sand overflow-hidden bg-white">
      {items.map((it, i) => (
        <li key={it._id || i} className="p-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink break-words">{it.description}</p>
            <p className="text-sm text-muted">
              {IN_KIND_TYPES[it.type] || it.type}
              {it.quantity ? ` · ${it.quantity}${it.unit ? ` ${it.unit}` : ''}` : ''}
              {it.valuationMethod ? ` · ${VALUATION_METHODS[it.valuationMethod] || it.valuationMethod}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            {it.estimatedValue !== undefined && (
              <p className="text-sm">
                <span className="font-semibold text-ink">{npr(it.estimatedValue)}</span>
                <span className="block text-xs text-muted">estimated value — not cash</span>
              </p>
            )}
            {it.status && (
              <span className={`chip mt-1 ${it.status === 'RECEIVED' ? 'bg-pine-tint text-pine' : it.status === 'CANCELLED' ? 'bg-paper-deep text-muted' : 'bg-marigold-tint text-marigold-text'}`}>
                {it.status === 'RECEIVED' ? 'Received' : it.status === 'CANCELLED' ? 'Cancelled' : 'Pledged'}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export const FundingBar = ({ pct, label }) => {
  if (pct === null || pct === undefined) return null;
  return (
    <div>
      <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || `${pct}% of funding secured`}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted mt-1.5">
        <span className="font-semibold text-marigold-text tabular-nums">{pct}%</span> of the funding goal secured by confirmed sponsors
      </p>
    </div>
  );
};
