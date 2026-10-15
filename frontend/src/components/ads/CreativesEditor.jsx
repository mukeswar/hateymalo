import React, { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { AdView } from './AdSlot';
import {
  AD_FORMATS, AD_LABELS, CTAS, CTA_LABELS, FORMAT_LABELS, MAX_CREATIVES, CREATIVE_STATUS,
  AdChip, emptyCreative, previewAd,
} from './adShared';

const isHttp = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());

const UrlField = ({ id, label, value, onChange, hint, required }) => {
  const bad = value && !isHttp(value);
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        aria-invalid={bad || undefined}
        aria-describedby={`${id}-hint`}
        className={`field font-mono !text-xs ${bad ? '!border-brand' : ''}`}
      />
      <p id={`${id}-hint`} className={`mt-1 text-xs ${bad ? 'text-brand' : 'text-muted'}`}>
        {bad ? 'Use a full link that starts with http:// or https://' : hint}
      </p>
    </div>
  );
};

/**
 * Edits the whole creatives array (existing ones keep their _id so unchanged
 * creatives keep their review decision on the server). Each creative has a
 * live preview rendered with the same <AdView> the site uses.
 * previewSize: { width, height } of the placement being previewed.
 */
const CreativesEditor = ({ value, onChange, advertiserName = '', allowedFormats = AD_FORMATS, previewSize = null, idPrefix = 'cr', disabled = false }) => {
  const [layout, setLayout] = useState('wide');
  const set = (idx, patch) => onChange(value.map((k, i) => (i === idx ? { ...k, ...patch } : k)));
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Up to {MAX_CREATIVES} creatives. Images and videos are links for now. Changing a creative sends it for review again.
        </p>
        <div role="group" aria-label="Preview layout" className="flex gap-1 rounded-full border border-sand bg-white p-1">
          {[
            ['wide', 'Wide slot'],
            ['card', 'Feed card'],
          ].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={layout === k} onClick={() => setLayout(k)} className={`min-h-9 rounded-full px-3.5 text-sm font-semibold ${layout === k ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {value.length === 0 && (
        <div className="surface-sunken p-6 text-center text-sm text-muted">No creatives yet. Add at least one before submitting for review.</div>
      )}

      {value.map((k, idx) => {
        const p = `${idPrefix}-${idx}`;
        const notAllowed = allowedFormats.length && !allowedFormats.includes(k.format);
        return (
          <fieldset key={k._id || `new-${idx}`} className="card p-4 sm:p-5" disabled={disabled}>
            <legend className="sr-only">Creative {idx + 1}</legend>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{k.name || `Creative ${idx + 1}`}</span>
                {k._id && k.status && <AdChip map={CREATIVE_STATUS} value={k.status} />}
                {!k.isActive && <span className="chip bg-paper-deep text-muted">Turned off</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => set(idx, { isActive: !k.isActive })}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-paper"
                  aria-pressed={!k.isActive}
                >
                  {k.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  {k.isActive ? 'Turn off' : 'Turn on'}
                </button>
                <button type="button" onClick={() => remove(idx)} className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-brand-tint hover:text-brand" aria-label={`Remove creative ${idx + 1}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {k.status === 'REJECTED' && k.rejectionReason && (
              <p className="mb-4 rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand">
                <strong>Not approved:</strong> {k.rejectionReason}
              </p>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-2 content-start">
                <div className="sm:col-span-2">
                  <label htmlFor={`${p}-name`} className="field-label">Name (only you see this)</label>
                  <input id={`${p}-name`} className="field" maxLength={120} value={k.name} onChange={(e) => set(idx, { name: e.target.value })} placeholder={`Creative ${idx + 1}`} />
                </div>
                <div>
                  <label htmlFor={`${p}-format`} className="field-label">Format</label>
                  <select id={`${p}-format`} className="field" value={k.format} onChange={(e) => set(idx, { format: e.target.value })} aria-describedby={notAllowed ? `${p}-fmt-warn` : undefined}>
                    {AD_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                  </select>
                  {notAllowed && <p id={`${p}-fmt-warn`} className="mt-1 text-xs text-brand">None of the chosen placements show this format.</p>}
                </div>
                <div>
                  <label htmlFor={`${p}-label`} className="field-label">Label</label>
                  <select id={`${p}-label`} className="field" value={k.labelText} onChange={(e) => set(idx, { labelText: e.target.value })}>
                    {AD_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {k.format === 'VIDEO' ? (
                  <>
                    <div className="sm:col-span-2">
                      <UrlField id={`${p}-video`} label="Video link (MP4 or WebM)" required value={k.videoUrl} onChange={(v) => set(idx, { videoUrl: v })} hint="Plays muted. Keep it short — 15 to 30 seconds works best." />
                    </div>
                    <div className="sm:col-span-2">
                      <UrlField id={`${p}-poster`} label="Poster image (optional)" value={k.posterUrl} onChange={(v) => set(idx, { posterUrl: v })} hint="Shown before the video plays." />
                    </div>
                    <div>
                      <label htmlFor={`${p}-skip`} className="field-label">Skip button after (seconds)</label>
                      <input id={`${p}-skip`} type="number" min="0" max="30" inputMode="numeric" className="field" value={k.skipAfterSeconds} onChange={(e) => set(idx, { skipAfterSeconds: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2">
                    <UrlField id={`${p}-image`} label="Image link" required value={k.imageUrl} onChange={(v) => set(idx, { imageUrl: v })} hint={previewSize?.width ? `Recommended ${previewSize.width} × ${previewSize.height} px (JPG, PNG or WebP).` : 'JPG, PNG or WebP.'} />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label htmlFor={`${p}-headline`} className="field-label">
                    Headline{k.format === 'NATIVE' && <span className="text-brand"> *</span>}
                  </label>
                  <input id={`${p}-headline`} className="field" maxLength={90} value={k.headline} onChange={(e) => set(idx, { headline: e.target.value })} />
                  <p className="mt-1 text-xs text-muted">{k.headline.length}/90</p>
                </div>
                {k.format !== 'IMAGE' && (
                  <div className="sm:col-span-2">
                    <label htmlFor={`${p}-body`} className="field-label">Text</label>
                    <textarea id={`${p}-body`} rows={3} className="field" maxLength={300} value={k.body} onChange={(e) => set(idx, { body: e.target.value })} />
                    <p className="mt-1 text-xs text-muted">{k.body.length}/300</p>
                  </div>
                )}
                <div>
                  <label htmlFor={`${p}-cta`} className="field-label">Button</label>
                  <select id={`${p}-cta`} className="field" value={k.cta} onChange={(e) => set(idx, { cta: e.target.value })}>
                    {CTAS.map((c) => <option key={c} value={c}>{CTA_LABELS[c]}</option>)}
                  </select>
                </div>
                {k.format !== 'NATIVE' && (
                  <div>
                    <label htmlFor={`${p}-alt`} className="field-label">Description for screen readers</label>
                    <input id={`${p}-alt`} className="field" maxLength={200} value={k.altText} onChange={(e) => set(idx, { altText: e.target.value })} placeholder="What the image or video shows" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Live preview</p>
                <div className="rounded-2xl border border-dashed border-sand bg-paper p-3 sm:p-4">
                  {(k.format === 'VIDEO' ? isHttp(k.videoUrl) : isHttp(k.imageUrl)) ? (
                    <div className={layout === 'card' ? 'max-w-xs mx-auto' : ''}>
                      <AdView ad={previewAd(k, advertiserName)} preview layout={layout} size={previewSize} />
                    </div>
                  ) : (
                    <p className="py-10 text-center text-sm text-muted">Add {k.format === 'VIDEO' ? 'a video' : 'an image'} link to see the preview.</p>
                  )}
                </div>
              </div>
            </div>
          </fieldset>
        );
      })}

      {!disabled && value.length < MAX_CREATIVES && (
        <button type="button" onClick={() => onChange([...value, emptyCreative(allowedFormats.includes('NATIVE') || !allowedFormats.length ? 'NATIVE' : allowedFormats[0])])} className="btn btn-ghost btn-sm min-h-10">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add creative
        </button>
      )}
    </div>
  );
};

export default CreativesEditor;
