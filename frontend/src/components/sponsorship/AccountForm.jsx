import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { ACCOUNT_TYPES, LogoTile, UrlPreviewField, isHttpUrl } from './shared';

// Create / edit form for a sponsor organisation. `compact` keeps only the
// essentials (used inline in the Apply flow); the full form is used in the portal.
export const blankAccount = () => ({
  name: '',
  type: 'COMPANY',
  description: '',
  website: '',
  panNumber: '',
  vatRegistered: false,
  address: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  logos: [{ label: 'Primary', url: '', background: 'ANY' }],
});

export const accountToForm = (a) => ({
  ...blankAccount(),
  ...Object.fromEntries(Object.keys(blankAccount()).map((k) => [k, a?.[k] ?? blankAccount()[k]])),
  logos: (a?.logos || []).map((l) => ({ label: l.label, url: l.url, background: l.background || 'ANY' })),
});

export const formToPayload = (f) => ({
  ...f,
  name: f.name.trim(),
  website: f.website.trim(),
  logos: f.logos.filter((l) => l.url.trim()).map((l) => ({ ...l, url: l.url.trim(), label: l.label.trim() || 'Logo' })),
});

export const validateAccount = (f) => {
  if (!f.name.trim()) return 'Organisation name is required';
  if (f.website && !isHttpUrl(f.website)) return 'Website must start with http:// or https://';
  if (f.contactEmail && !/^\S+@\S+\.\S+$/.test(f.contactEmail)) return 'Contact email is not valid';
  if (f.logos.some((l) => l.url.trim() && !isHttpUrl(l.url))) return 'Each logo needs an http(s) image link';
  return '';
};

const AccountForm = ({ initial, onSubmit, submitLabel = 'Save', saving = false, compact = false, onCancel, idPrefix = 'acc' }) => {
  const [f, setF] = useState(() => initial || blankAccount());
  const [error, setError] = useState('');
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setLogo = (i, patch) => set({ logos: f.logos.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  const submit = (e) => {
    e.preventDefault();
    const v = validateAccount(f);
    setError(v);
    if (!v) onSubmit(formToPayload(f));
  };

  const id = (k) => `${idPrefix}-${k}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor={id('name')} className="field-label">Organisation name <span className="text-brand">*</span></label>
          <input id={id('name')} className="field" required maxLength={140} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Himalayan Tea Company" />
        </div>
        <div>
          <label htmlFor={id('type')} className="field-label">Type</label>
          <select id={id('type')} className="field" value={f.type} onChange={(e) => set({ type: e.target.value })}>
            {Object.entries(ACCOUNT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id('email')} className="field-label">Contact email</label>
          <input id={id('email')} className="field" type="email" value={f.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} placeholder="partnerships@example.com" />
        </div>
        <div className={compact ? 'sm:col-span-2' : ''}>
          <label htmlFor={id('web')} className="field-label">Website</label>
          <input id={id('web')} className="field" type="url" inputMode="url" value={f.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" />
        </div>
        {!compact && (
          <>
            <div>
              <label htmlFor={id('phone')} className="field-label">Contact phone</label>
              <input id={id('phone')} className="field" type="tel" maxLength={40} value={f.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id('cname')} className="field-label">Contact person</label>
              <input id={id('cname')} className="field" maxLength={120} value={f.contactName} onChange={(e) => set({ contactName: e.target.value })} />
            </div>
            <div>
              <label htmlFor={id('pan')} className="field-label">PAN number</label>
              <input id={id('pan')} className="field" maxLength={20} value={f.panNumber} onChange={(e) => set({ panNumber: e.target.value })} aria-describedby={id('pan-hint')} />
              <p id={id('pan-hint')} className="text-xs text-muted mt-1">Used for receipts. Changing it after verification needs a fresh check.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={id('addr')} className="field-label">Address</label>
              <input id={id('addr')} className="field" maxLength={300} value={f.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={id('desc')} className="field-label">About the organisation</label>
              <textarea id={id('desc')} className="field min-h-[96px]" maxLength={2000} value={f.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <label className="sm:col-span-2 flex items-center gap-3 text-sm font-medium text-ink-soft">
              <input type="checkbox" className="w-4 h-4 accent-[var(--color-brand)]" checked={f.vatRegistered} onChange={(e) => set({ vatRegistered: e.target.checked })} />
              VAT registered
            </label>
          </>
        )}
      </div>

      <fieldset className="space-y-3">
        <legend className="field-label">Logos</legend>
        <p className="text-xs text-muted -mt-1">Add image links for your logo variants. Nothing is printed or posted until you approve logo use on a specific sponsorship.</p>
        {f.logos.map((l, i) => (
          <div key={i} className="surface-sunken p-4 space-y-3">
            <UrlPreviewField id={id(`logo-${i}`)} label={`Logo ${i + 1} link`} value={l.url} onChange={(url) => setLogo(i, { url })} name={f.name} />
            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <label htmlFor={id(`logo-label-${i}`)} className="field-label">Label</label>
                <input id={id(`logo-label-${i}`)} className="field" maxLength={60} value={l.label} onChange={(e) => setLogo(i, { label: e.target.value })} placeholder="Primary, white version…" />
              </div>
              <div className="col-span-2 sm:col-span-1 row-start-2 sm:row-start-auto">
                <label htmlFor={id(`logo-bg-${i}`)} className="field-label">Works on</label>
                <select id={id(`logo-bg-${i}`)} className="field" value={l.background} onChange={(e) => setLogo(i, { background: e.target.value })}>
                  <option value="ANY">Any background</option>
                  <option value="LIGHT">Light backgrounds</option>
                  <option value="DARK">Dark backgrounds</option>
                </select>
              </div>
              <button type="button" onClick={() => set({ logos: f.logos.filter((_, j) => j !== i) })} className="w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-brand hover:bg-brand-tint" aria-label={`Remove logo ${i + 1}`}>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {l.background === 'DARK' && isHttpUrl(l.url) && (
              <div className="flex items-center gap-2 text-xs text-muted"><LogoTile url={l.url} name={f.name} className="w-12 h-12" dark /> Preview on dark</div>
            )}
          </div>
        ))}
        {f.logos.length < 10 && (
          <button type="button" onClick={() => set({ logos: [...f.logos, { label: '', url: '', background: 'ANY' }] })} className="btn btn-ghost btn-sm">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add a logo variant
          </button>
        )}
      </fieldset>

      {error && <p className="text-sm text-brand font-medium" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-3 justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>}
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default AccountForm;
