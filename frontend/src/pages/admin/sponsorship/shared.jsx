import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox, Plus, Trash2, ExternalLink } from 'lucide-react';

/* --------------------------------------------------------------------------
   Sponsorship module — shared constants, formatters and small UI pieces.
   Contract: docs/SPONSORSHIP.md. The server enforces every rule; these
   helpers only decide what to show.
   -------------------------------------------------------------------------- */

export const SP = '/sponsorship';

export const OPP_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'];
export const CAMPAIGN_TYPES = ['CLEANUP', 'BLOOD_DONATION', 'TREE_PLANTATION', 'EDUCATION', 'DISASTER_RELIEF', 'FOOD_DISTRIBUTION', 'HEALTH', 'OTHER'];
export const TIER_LEVELS = ['TITLE', 'GOLD', 'SILVER', 'BRONZE', 'COMMUNITY_PARTNER', 'MEDIA_PARTNER', 'IN_KIND', 'CUSTOM'];
export const LOGO_SIZES = ['XL', 'L', 'M', 'S', 'NONE'];
export const SLOT_SIZES = ['XL', 'L', 'M', 'S'];
export const RESOURCE_TYPES = ['CASH', 'MATERIALS', 'EQUIPMENT', 'TRANSPORT', 'FOOD', 'UNIFORMS', 'VENUE', 'MEDIA', 'OTHER'];
export const DELIVERABLE_TYPES = ['VEST_LOGO', 'VENUE_BANNER', 'BACKDROP', 'ID_CARD', 'SOCIAL_MENTION', 'VIDEO', 'PHOTO_ALBUM', 'WEBSITE_LISTING', 'SPEAKING_SLOT', 'IMPACT_REPORT', 'OTHER'];
export const DELIVERABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'WAIVED'];
export const VALUATION_METHODS = ['SPONSOR_INVOICE', 'MARKET_QUOTE', 'SPONSOR_DECLARED', 'STAFF_ESTIMATE', 'NOT_VALUED'];
export const INKIND_STATUSES = ['PLEDGED', 'RECEIVED', 'CANCELLED'];
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];
export const PLACEMENTS = ['VEST_FRONT', 'VEST_BACK', 'BANNER', 'BACKDROP', 'ID_CARD', 'SIGNAGE'];
export const ACCOUNT_TYPES = ['COMPANY', 'NGO', 'LOCAL_BUSINESS', 'EDUCATION', 'GOVERNMENT', 'MEDIA', 'INDIVIDUAL', 'OTHER'];
export const VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED'];

export const STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED', 'FULFILLED', 'DECLINED', 'WITHDRAWN', 'CANCELLED'];
export const OPEN_STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'];
export const CLOSED_STAGES = ['DECLINED', 'WITHDRAWN', 'CANCELLED'];
export const CONTRACTED_STAGES = ['AGREED', 'FULFILLED'];
export const TRANSITIONS = {
  APPLIED: ['IN_REVIEW', 'NEGOTIATING', 'AGREED', 'DECLINED'],
  IN_REVIEW: ['NEGOTIATING', 'AGREED', 'DECLINED'],
  NEGOTIATING: ['IN_REVIEW', 'AGREED', 'DECLINED'],
  AGREED: ['FULFILLED', 'CANCELLED', 'NEGOTIATING'],
  FULFILLED: ['AGREED'],
  DECLINED: ['IN_REVIEW'],
  WITHDRAWN: [],
  CANCELLED: ['IN_REVIEW'],
};
export const MANAGER_ONLY_STAGES = ['AGREED', 'FULFILLED', 'CANCELLED'];

// Stage moves this viewer may make (same rule as the server)
export const allowedMoves = (stage, viewer = {}) =>
  (TRANSITIONS[stage] || []).filter((to) => (MANAGER_ONLY_STAGES.includes(to) ? viewer.isManager : viewer.isManager || viewer.isOrganizer));

const LABEL_OVERRIDES = {
  IN_REVIEW: 'In review',
  TITLE: 'Title',
  XL: 'XL',
  L: 'L',
  M: 'M',
  S: 'S',
  NONE: 'No logo',
  VEST_LOGO: 'Vest logo',
  ID_CARD: 'ID card',
  CONNECTIPS: 'connectIPS',
  ESEWA: 'eSewa',
  KHALTI: 'Khalti',
  NGO: 'NGO',
};

// 'COMMUNITY_PARTNER' → 'Community partner'
export const label = (v) => {
  if (!v) return '';
  if (LABEL_OVERRIDES[v]) return LABEL_OVERRIDES[v];
  const s = String(v).replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const npr = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const hasValue = (v) => v !== undefined && v !== null;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const dateRange = (a, b) => {
  if (!a && !b) return '';
  if (!b || toDateInput(a) === toDateInput(b)) return fmtDate(a || b);
  return `${fmtDate(a)} – ${fmtDate(b)}`;
};

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;
export const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
export const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || '';

export const toneFor = (status = '') => {
  const s = String(status).toUpperCase();
  if (['AGREED', 'FULFILLED', 'VERIFIED', 'OPEN', 'DONE', 'RECEIVED', 'COMPLETED'].includes(s)) return 'bg-pine-tint text-pine';
  if (['APPLIED', 'PENDING', 'DRAFT', 'PLEDGED', 'IN_PROGRESS'].includes(s)) return 'bg-marigold-tint text-marigold-text';
  if (['DECLINED', 'WITHDRAWN', 'CANCELLED', 'REJECTED'].includes(s)) return 'bg-brand-tint text-brand';
  if (['CLOSED', 'WAIVED'].includes(s)) return 'bg-paper-deep text-ink-soft';
  return 'bg-sky-tint text-sky-ink';
};

export const Chip = ({ status, children, className = '' }) => (
  <span className={`chip ${toneFor(status)} ${className}`}>{children || label(status)}</span>
);

export const BTN_PRIMARY = 'btn btn-sm btn-primary min-h-10';
export const BTN_PINE = 'btn btn-sm btn-pine min-h-10';
export const BTN_GHOST = 'btn btn-sm btn-ghost min-h-10';
export const BTN_DANGER = 'btn btn-sm min-h-10 bg-brand-tint text-brand hover:bg-brand hover:text-white';
export const ICON_BTN =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent';

export const Panel = ({ title, count, description, actions, children, className = '' }) => (
  <section className={`card overflow-hidden animate-rise ${className}`}>
    <div className="flex flex-col gap-3 border-b border-sand p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 align-middle text-sm font-semibold text-muted">({count})</span>}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </section>
);

export const Empty = ({ icon: Icon = Inbox, children, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
    <Icon className="mb-2 h-7 w-7 text-muted/60" aria-hidden="true" />
    <p className="text-sm font-medium text-muted">{children}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const Loading = ({ children = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 px-4 py-10" role="status" aria-live="polite">
    <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-sand border-t-brand" aria-hidden="true" />
    <span className="text-sm text-muted">{children}</span>
  </div>
);

export const Stat = ({ label: l, value, hint, tone = 'text-ink', onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card p-4 text-left ${onClick ? 'card-hover' : ''}`}
    >
      <p className="text-sm font-medium text-muted">{l}</p>
      <p className={`mt-1.5 font-display text-2xl font-bold leading-none tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-1.5 text-xs font-semibold text-muted">{hint}</p>}
    </Tag>
  );
};

// Labelled field wrapper; pass the control as children with the same id
export const Field = ({ id, label: l, hint, children, className = '' }) => (
  <div className={className}>
    {l && (
      <label htmlFor={id} className="field-label">
        {l}
      </label>
    )}
    {children}
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

export const Select = ({ id, value, onChange, options, render = label, includeEmpty, className = '', ...rest }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`field ${className}`} {...rest}>
    {includeEmpty !== undefined && <option value="">{includeEmpty}</option>}
    {options.map((o) => (
      <option key={o} value={o}>
        {render(o)}
      </option>
    ))}
  </select>
);

// Editable list of short strings (benefits, objectives, highlights, links)
export const ListEditor = ({ idPrefix, items, onChange, placeholder, addLabel = 'Add', max = 30, type = 'text', disabled }) => (
  <div className="space-y-2">
    {items.map((it, i) => (
      <div key={i} className="flex items-center gap-2">
        <label htmlFor={`${idPrefix}-${i}`} className="sr-only">
          {placeholder} {i + 1}
        </label>
        <input
          id={`${idPrefix}-${i}`}
          type={type}
          value={it}
          disabled={disabled}
          onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          placeholder={placeholder}
          className="field"
        />
        {!disabled && (
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className={ICON_BTN} aria-label={`Remove item ${i + 1}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    ))}
    {!disabled && items.length < max && (
      <button type="button" onClick={() => onChange([...items, ''])} className={BTN_GHOST}>
        <Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}
      </button>
    )}
  </div>
);

export const LinkList = ({ urls = [] }) =>
  urls.length ? (
    <ul className="space-y-1">
      {urls.map((u, i) => (
        <li key={i} className="min-w-0">
          {isHttpUrl(u) ? (
            <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-sky-ink hover:underline">
              <span className="truncate">{u}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-sm text-muted">{u}</span>
          )}
        </li>
      ))}
    </ul>
  ) : null;

// Image preview for a URL field (only http(s) links are rendered)
export const UrlPreview = ({ url, alt = '', className = 'h-32 w-full' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url) return null;
  if (!isHttpUrl(url)) return <p className="mt-1 text-xs font-semibold text-brand">Use a link that starts with http:// or https://</p>;
  if (failed) return <p className="mt-1 text-xs font-semibold text-brand">That image could not be loaded. Check the link.</p>;
  return <img src={url} alt={alt} onError={() => setFailed(true)} className={`mt-2 rounded-xl border border-sand bg-paper object-contain ${className}`} />;
};

// Escape closes only the top-most dialog when dialogs are stacked
const useEscape = (ref, onClose) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelectorAll('[data-sp-dialog]');
      if (open[open.length - 1] === ref.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ref, onClose]);
};

export const Modal = ({ title, icon: Icon, onClose, size = 'max-w-md', children }) => {
  const titleId = useId();
  const ref = useRef(null);
  useEscape(ref, onClose);
  return createPortal(
    <div
      ref={ref}
      data-sp-dialog=""
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`card !rounded-3xl w-full ${size} max-h-[90vh] overflow-y-auto p-5 sm:p-6 animate-pop`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-xl font-bold text-ink">
            {Icon && <Icon className="h-5 w-5 text-brand" aria-hidden="true" />}
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className={`-mr-1 -mt-1 ${ICON_BTN}`}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

// Right-hand drawer for large records (deal details)
export const Drawer = ({ title, subtitle, onClose, children, headerExtra }) => {
  const titleId = useId();
  const ref = useRef(null);
  useEscape(ref, onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <div ref={ref} data-sp-dialog="" className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-sm animate-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex h-full w-full max-w-3xl flex-col bg-paper shadow-[var(--shadow-lift)] animate-rise">
        <div className="flex items-start justify-between gap-3 border-b border-sand bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-xl font-bold text-ink">
              {title}
            </h2>
            {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
            {headerExtra}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={ICON_BTN}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};

// Asks for a short note or reason before an action (stage moves, removals, verification)
export const NoteDialog = ({ title, message, fieldLabel = 'Note (optional)', confirmLabel = 'Confirm', required, danger, onCancel, onConfirm }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const submit = async (e) => {
    e.preventDefault();
    if (required && !text.trim()) return;
    setBusy(true);
    try {
      await onConfirm(text.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={submit} className="space-y-4">
        {message && <p className="text-sm text-ink-soft">{message}</p>}
        <Field id={id} label={fieldLabel}>
          <textarea id={id} rows={3} value={text} onChange={(e) => setText(e.target.value)} required={required} maxLength={500} className="field" />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy || (required && !text.trim())} className={`btn ${danger ? 'bg-brand text-white hover:bg-brand-dark' : 'btn-primary'}`}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Small segmented tab bar used inside editors and the deal drawer
export const SubTabs = ({ tabs, value, onChange, ariaLabel }) => (
  <div role="tablist" aria-label={ariaLabel} className="flex gap-1 overflow-x-auto rounded-full border border-sand bg-white p-1">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={value === t.id}
        onClick={() => onChange(t.id)}
        className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${
          value === t.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'
        }`}
      >
        {t.label}
        {t.badge ? <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs text-white">{t.badge}</span> : null}
      </button>
    ))}
  </div>
);

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

// rows: array of plain objects with identical keys
export const downloadCsv = (rows, filename) => {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const cell = (v) => {
    let s = v === undefined || v === null ? '' : String(v);
    // Neutralise spreadsheet formulas
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.map(cell).join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\r\n');
  downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
  return true;
};
