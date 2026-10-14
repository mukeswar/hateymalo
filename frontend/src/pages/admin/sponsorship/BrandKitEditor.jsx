import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, Download, AlertTriangle, BadgeCheck, Palette, Image as ImageIcon } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { BRAND_ITEMS, renderBrandKitSvg } from '../../../lib/brandKitSvg';
import {
  SP, SLOT_SIZES, PLACEMENTS, label, errMsg, dateRange, fmtDateTime, Field, Select, Loading, Empty, downloadBlob,
  BTN_PRIMARY, BTN_PINE, BTN_GHOST, ICON_BTN,
} from './shared';

const BRAND_LOGO = '/logo-mark.png';

// Largest bitmap we ask the browser for (side and area), so big banners don't crash the tab
const MAX_SIDE = 6000;
const MAX_AREA = 16e6;

const blobToDataUri = (blob) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

// Fetch an image and return it as a data: URI so the exported file is self-contained
const inlineImage = async (url) => {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Not an image');
  return blobToDataUri(blob);
};

const slugify = (s) => String(s || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'campaign';

const toSlot = (s) => ({
  deal: String(s.deal),
  size: SLOT_SIZES.includes(s.size) ? s.size : SLOT_SIZES.includes(s.tier?.logoSize) ? s.tier.logoSize : 'M',
  placements: Array.isArray(s.placements) ? s.placements : [...PLACEMENTS],
  sponsorName: s.sponsorName,
  logoUrl: s.logoUrl,
  logoUsageApproved: !!s.logoUsageApproved,
  tier: s.tier || null,
});

/**
 * Campaign brand kit: place agreed sponsors on field kit, preview every item
 * live and export print-ready SVG / PNG files.
 */
const BrandKitEditor = ({ opportunityId, opportunity, canEdit = true }) => {
  const { showToast } = useToast();
  const [kit, setKit] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');

  const adopt = (data) => {
    setKit(data);
    setDraft({
      campaignLabel: data.campaignLabel || '',
      accentColor: /^#[0-9A-Fa-f]{6}$/.test(data.accentColor || '') ? data.accentColor : '#B5232C',
      notes: data.notes || '',
      slots: (data.slots || []).map(toSlot),
      unplaced: (data.unplaced || []).map(toSlot),
    });
    setDirty(false);
  };

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await API.get(`${SP}/opportunities/${opportunityId}/brand-kit`);
      adopt(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not load the brand kit'));
    }
  }, [opportunityId]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const updateSlot = (i, patch) => update({ slots: draft.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const place = (u) => update({ slots: [...draft.slots, u], unplaced: draft.unplaced.filter((x) => x.deal !== u.deal) });
  const unplace = (i) => update({ unplaced: [...draft.unplaced, draft.slots[i]], slots: draft.slots.filter((_, j) => j !== i) });
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= draft.slots.length) return;
    const slots = [...draft.slots];
    [slots[i], slots[j]] = [slots[j], slots[i]];
    update({ slots });
  };

  const save = async (approve) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(draft.accentColor)) {
      showToast('Accent colour must look like #B5232C', 'error');
      return;
    }
    if (approve && !window.confirm('Approve this layout for printing? Any later change will clear the approval.')) return;
    setBusy(true);
    try {
      const res = await API.put(`${SP}/opportunities/${opportunityId}/brand-kit`, {
        campaignLabel: draft.campaignLabel,
        accentColor: draft.accentColor,
        notes: draft.notes,
        slots: draft.slots.map((s, i) => ({ deal: s.deal, order: i, size: s.size, placements: s.placements })),
        ...(approve ? { approve: true } : {}),
      });
      adopt(res.data.data);
      showToast(res.data.message || (approve ? 'Brand kit approved' : 'Brand kit saved'), 'success');
    } catch (e) {
      showToast(errMsg(e, 'Could not save the brand kit'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const meta = useMemo(() => {
    const o = opportunity || kit?.opportunity || {};
    return { title: o.title || '', dateText: dateRange(o.startDate, o.endDate), location: o.location || '' };
  }, [opportunity, kit]);

  const sponsorsFor = (item, hrefs = null) =>
    (draft?.slots || [])
      .filter((s) => s.placements.includes(item))
      .map((s, i) => ({
        name: s.sponsorName,
        logoHref: s.logoUsageApproved && s.logoUrl ? (hrefs ? hrefs[s.logoUrl] || s.logoUrl : s.logoUrl) : '',
        size: s.size,
        order: i,
        logoUsageApproved: s.logoUsageApproved,
      }));

  const svgFor = (item, hrefs = null, brandHref = BRAND_LOGO) =>
    renderBrandKitSvg({
      item,
      campaignLabel: draft.campaignLabel,
      accentColor: draft.accentColor,
      brandLogoHref: brandHref,
      title: meta.title,
      dateText: meta.dateText,
      location: meta.location,
      sponsors: sponsorsFor(item, hrefs),
    });

  // Inline every image the item uses. Returns the SVG and the sponsors whose logos stayed as links.
  const buildExportSvg = async (item) => {
    const hrefs = {};
    const failed = [];
    const used = draft.slots.filter((s) => s.placements.includes(item) && s.logoUsageApproved && s.logoUrl);
    await Promise.all(
      used.map(async (s) => {
        try {
          hrefs[s.logoUrl] = await inlineImage(s.logoUrl);
        } catch {
          failed.push(s.sponsorName);
        }
      })
    );
    let brandHref;
    try {
      brandHref = await inlineImage(BRAND_LOGO);
    } catch {
      brandHref = new URL(BRAND_LOGO, window.location.origin).href;
      failed.push('Hateymalo logo');
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n${svgFor(item, hrefs, brandHref)}`;
    return { svg, failed };
  };

  const fileBase = (item) => `${slugify(draft.campaignLabel || meta.title)}-${item.toLowerCase().replace(/_/g, '-')}`;

  const downloadSvg = async (item, pre) => {
    const { svg, failed } = pre || (await buildExportSvg(item));
    downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${fileBase(item)}.svg`);
    if (failed.length) {
      showToast(`Downloaded SVG. Could not embed: ${failed.join(', ')} (their server blocks it) — the file links to those images instead, so keep it online or replace them before printing.`, 'warning');
    } else if (!pre) {
      showToast('Print-ready SVG downloaded (real millimetre size)', 'success');
    }
  };

  const downloadPng = async (item) => {
    const pre = await buildExportSvg(item);
    if (pre.failed.length) {
      // An image that cannot be embedded would be missing from the PNG; give the SVG instead
      await downloadSvg(item, pre);
      showToast('PNG needs every logo embedded, so an SVG was downloaded instead.', 'info');
      return;
    }
    const { w, h } = BRAND_ITEMS[item];
    const pxPerMm = Math.min(300 / 25.4, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_AREA / (w * h)));
    const cw = Math.round(w * pxPerMm);
    const ch = Math.round(h * pxPerMm);
    const url = URL.createObjectURL(new Blob([pre.svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
      const blob = await new Promise((resolve, reject) => {
        try {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), 'image/png');
        } catch (err) {
          reject(err); // SecurityError on a tainted canvas
        }
      });
      downloadBlob(blob, `${fileBase(item)}.png`);
      const dpi = Math.round(pxPerMm * 25.4);
      showToast(`PNG downloaded (${cw}×${ch}px, about ${dpi} dpi at full size)${dpi < 150 ? ' — use the SVG for large-format printing' : ''}`, 'success');
    } catch {
      await downloadSvg(item, pre);
      showToast('The browser could not draw a PNG of this artwork, so the SVG was downloaded instead.', 'warning');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const runExport = async (key, fn) => {
    setExporting(key);
    try {
      await fn();
    } catch (e) {
      showToast(errMsg(e, 'Export failed'), 'error');
    } finally {
      setExporting('');
    }
  };

  if (error) return <Empty icon={AlertTriangle}>{error}</Empty>;
  if (!draft) return <Loading>Loading brand kit…</Loading>;

  const notApproved = [...draft.slots, ...draft.unplaced].filter((s) => !s.logoUsageApproved);
  const noLogo = draft.slots.filter((s) => s.logoUsageApproved && !s.logoUrl);
  const approvedAt = kit?.approvedAt && !dirty ? kit.approvedAt : null;

  return (
    <div className="space-y-5">
      {/* Approval state */}
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${approvedAt ? 'bg-pine-tint text-pine' : 'bg-marigold-tint text-marigold-text'}`}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          {approvedAt ? <BadgeCheck className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          {approvedAt ? `Layout approved ${fmtDateTime(approvedAt)}` : dirty ? 'Unsaved changes — saving clears any earlier approval' : 'Not approved for printing yet'}
        </p>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => save(false)} className={BTN_GHOST}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" disabled={busy} onClick={() => save(true)} className={BTN_PINE}>
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Save & approve
            </button>
          </div>
        )}
      </div>

      {notApproved.length > 0 && (
        <div role="alert" className="rounded-2xl border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" /> Logo use not approved by the sponsor — left out of all artwork:
          </p>
          <p className="mt-1">{notApproved.map((s) => s.sponsorName).join(', ')}</p>
          <p className="mt-1 text-xs">They appear automatically once the sponsor approves their logo in the sponsor portal.</p>
        </div>
      )}
      {noLogo.length > 0 && (
        <p className="rounded-2xl bg-sky-tint px-4 py-3 text-sm text-sky-ink">
          No logo uploaded yet, shown as text: {noLogo.map((s) => s.sponsorName).join(', ')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id={`bk-${opportunityId}-label`} label="Campaign label" hint="Printed on every item (max 60 characters).">
          <input id={`bk-${opportunityId}-label`} maxLength={60} disabled={!canEdit} value={draft.campaignLabel} onChange={(e) => update({ campaignLabel: e.target.value })} placeholder={meta.title} className="field" />
        </Field>
        <Field id={`bk-${opportunityId}-color`} label="Accent colour">
          <div className="flex items-center gap-2">
            <input type="color" aria-label="Pick accent colour" disabled={!canEdit} value={/^#[0-9A-Fa-f]{6}$/.test(draft.accentColor) ? draft.accentColor : '#B5232C'} onChange={(e) => update({ accentColor: e.target.value.toUpperCase() })} className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-sand bg-white p-1" />
            <input id={`bk-${opportunityId}-color`} disabled={!canEdit} value={draft.accentColor} onChange={(e) => update({ accentColor: e.target.value })} pattern="#[0-9A-Fa-f]{6}" maxLength={7} className="field font-mono" />
          </div>
        </Field>
      </div>
      <Field id={`bk-${opportunityId}-notes`} label="Notes for the print team">
        <textarea id={`bk-${opportunityId}-notes`} rows={2} maxLength={1000} disabled={!canEdit} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} className="field" />
      </Field>

      {/* Placement editor */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-labelledby={`bk-${opportunityId}-placed`} className="space-y-2">
          <h3 id={`bk-${opportunityId}-placed`} className="text-base font-bold text-ink">Placed sponsors <span className="text-sm font-semibold text-muted">(top = first)</span></h3>
          {draft.slots.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-sand bg-white px-4 py-6 text-center text-sm text-muted">No sponsors placed yet.</p>
          ) : (
            <ul className="space-y-2">
              {draft.slots.map((s, i) => (
                <li key={s.deal} className="rounded-2xl border border-sand bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {s.logoUrl ? (
                        <img src={s.logoUrl} alt="" className="h-10 w-16 shrink-0 rounded-lg border border-sand bg-paper object-contain" />
                      ) : (
                        <span className="inline-flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-paper-deep text-muted"><ImageIcon className="h-4 w-4" aria-hidden="true" /></span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{s.sponsorName}</p>
                        <p className="text-xs text-muted">
                          {s.tier?.name || 'No package'}
                          {!s.logoUsageApproved && <span className="ml-1 font-semibold text-brand">· logo not approved</span>}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <label htmlFor={`bk-size-${s.deal}`} className="sr-only">Logo size for {s.sponsorName}</label>
                        <Select id={`bk-size-${s.deal}`} value={s.size} onChange={(v) => updateSlot(i, { size: v })} options={SLOT_SIZES} className="!w-20 !py-2" />
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={ICON_BTN} aria-label={`Move ${s.sponsorName} up`}><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === draft.slots.length - 1} className={ICON_BTN} aria-label={`Move ${s.sponsorName} down`}><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => unplace(i)} className={ICON_BTN} aria-label={`Remove ${s.sponsorName} from the kit`}><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                  <fieldset className="mt-2.5">
                    <legend className="sr-only">Where {s.sponsorName} appears</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {PLACEMENTS.map((p) => {
                        const on = s.placements.includes(p);
                        return (
                          <label key={p} className={`chip cursor-pointer border ${on ? 'border-ink bg-ink text-white' : 'border-sand bg-white text-ink-soft'} ${canEdit ? '' : 'cursor-default'}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              disabled={!canEdit}
                              checked={on}
                              onChange={(e) => updateSlot(i, { placements: e.target.checked ? [...s.placements, p] : s.placements.filter((x) => x !== p) })}
                            />
                            {label(p)}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby={`bk-${opportunityId}-unplaced`} className="space-y-2">
          <h3 id={`bk-${opportunityId}-unplaced`} className="text-base font-bold text-ink">Agreed, not placed</h3>
          {draft.unplaced.length === 0 ? (
            <p className="text-sm text-muted">Every agreed sponsor is placed. Sponsors appear here once their deal is agreed.</p>
          ) : (
            <ul className="space-y-2">
              {draft.unplaced.map((u) => (
                <li key={u.deal} className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-sand bg-white p-2.5 pl-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{u.sponsorName}</span>
                    <span className="block text-xs text-muted">{u.tier?.name || 'No package'}{!u.logoUsageApproved && ' · logo not approved'}</span>
                  </span>
                  {canEdit && (
                    <button type="button" onClick={() => place(u)} className={BTN_GHOST} aria-label={`Place ${u.sponsorName}`}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Place
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Live previews + downloads */}
      <section aria-labelledby={`bk-${opportunityId}-previews`} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`bk-${opportunityId}-previews`} className="flex items-center gap-2 text-base font-bold text-ink">
            <Palette className="h-4 w-4 text-brand" aria-hidden="true" /> Live previews
          </h3>
          <p className="text-xs text-muted">SVG = print-ready at real size (mm). PNG = up to 300 dpi.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(BRAND_ITEMS).map(([key, spec]) => (
            <figure key={key} className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-white">
              <div
                className="flex h-56 items-center justify-center bg-paper-deep p-3 [&>svg]:h-full [&>svg]:max-h-full [&>svg]:w-full [&>svg]:max-w-full"
                role="img"
                aria-label={`${spec.label} preview`}
                // Markup comes from our own generator, which escapes every text value
                dangerouslySetInnerHTML={{ __html: svgFor(key) }}
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-sand p-3">
                <span className="text-sm font-semibold text-ink">{spec.label}</span>
                <span className="flex gap-1.5">
                  <button type="button" disabled={!!exporting} onClick={() => runExport(`${key}-svg`, () => downloadSvg(key))} className="btn btn-sm btn-ghost min-h-9" aria-label={`Download ${spec.label} as SVG`}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> {exporting === `${key}-svg` ? '…' : 'SVG'}
                  </button>
                  <button type="button" disabled={!!exporting} onClick={() => runExport(`${key}-png`, () => downloadPng(key))} className="btn btn-sm btn-ghost min-h-9" aria-label={`Download ${spec.label} as PNG`}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> {exporting === `${key}-png` ? '…' : 'PNG'}
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="text-xs text-muted">
          Only sponsors ticked for an item appear on it. Previews show unsaved changes too; downloads use exactly what you see.
        </p>
      </section>
      {canEdit && dirty && (
        <div className="sticky bottom-0 flex justify-end gap-2 rounded-2xl border border-sand bg-white/95 p-3 backdrop-blur">
          <button type="button" onClick={() => kit && adopt(kit)} className={BTN_GHOST}>Discard changes</button>
          <button type="button" disabled={busy} onClick={() => save(false)} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
    </div>
  );
};

export default BrandKitEditor;
