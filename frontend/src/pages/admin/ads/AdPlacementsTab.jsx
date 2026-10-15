import React, { useCallback, useEffect, useState } from 'react';
import { LayoutTemplate, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AD_FORMATS, FORMAT_LABELS, SURFACES, SURFACE_LABELS, nprAd } from '../../../components/ads/adShared';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, Empty, Field, ICON_BTN, Loading, Modal, Panel, errMsg } from '../sponsorship/shared';

// Slots the website and app actually render (a new key shows nothing until a client renders it)
const RENDERED_KEYS = ['home.banner', 'feed.inline', 'content.footer', 'events.list'];

const blank = () => ({
  key: '', name: '', description: '', surfaces: ['WEB', 'APP'], formats: ['IMAGE', 'NATIVE'],
  width: 1200, height: 628, maxAds: 1, rateCard: { flatPerDay: 0, cpm: 0, cpc: 0 }, isActive: true, order: 10,
});

const Toggle = ({ on, onClick, children }) => (
  <button type="button" aria-pressed={on} onClick={onClick} className={`chip !py-1.5 !px-3.5 border ${on ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}>
    {children}
  </button>
);

const PlacementForm = ({ initial, onCancel, onSave, keyLocked }) => {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const n = (v) => Math.max(0, Math.round(Number(v) || 0));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...(keyLocked ? {} : { key: f.key.trim().toLowerCase() }),
        name: f.name, description: f.description, surfaces: f.surfaces, formats: f.formats,
        width: n(f.width), height: n(f.height), maxAds: Math.min(5, Math.max(1, n(f.maxAds))),
        rateCard: { flatPerDay: n(f.rateCard.flatPerDay), cpm: n(f.rateCard.cpm), cpc: n(f.rateCard.cpc) },
        isActive: f.isActive, order: n(f.order),
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="pl-key" label="Key" hint={keyLocked ? 'Campaigns use this key, so it cannot change.' : 'Like page.slot — lowercase, digits and dots.'}>
          <input id="pl-key" className="field font-mono !text-xs" required disabled={keyLocked} value={f.key} onChange={(e) => set({ key: e.target.value })} />
        </Field>
        <Field id="pl-name" label="Name">
          <input id="pl-name" className="field" required maxLength={120} value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field id="pl-desc" label="Description (shown to advertisers)" className="sm:col-span-2">
          <textarea id="pl-desc" rows={2} className="field" maxLength={500} value={f.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>
      <fieldset>
        <legend className="field-label">Surfaces</legend>
        <div className="flex flex-wrap gap-2">{SURFACES.map((s) => <Toggle key={s} on={f.surfaces.includes(s)} onClick={() => toggle('surfaces', s)}>{SURFACE_LABELS[s]}</Toggle>)}</div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Formats</legend>
        <div className="flex flex-wrap gap-2">{AD_FORMATS.map((s) => <Toggle key={s} on={f.formats.includes(s)} onClick={() => toggle('formats', s)}>{FORMAT_LABELS[s]}</Toggle>)}</div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field id="pl-w" label="Width (px)"><input id="pl-w" type="number" min="0" max="4000" className="field" value={f.width} onChange={(e) => set({ width: e.target.value })} /></Field>
        <Field id="pl-h" label="Height (px)"><input id="pl-h" type="number" min="0" max="4000" className="field" value={f.height} onChange={(e) => set({ height: e.target.value })} /></Field>
        <Field id="pl-max" label="Ads per slot"><input id="pl-max" type="number" min="1" max="5" className="field" value={f.maxAds} onChange={(e) => set({ maxAds: e.target.value })} /></Field>
        <Field id="pl-order" label="Order"><input id="pl-order" type="number" min="0" max="999" className="field" value={f.order} onChange={(e) => set({ order: e.target.value })} /></Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="field-label">Rate card (whole NPR, 0 = not offered)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field id="pl-flat" label="Flat per day"><input id="pl-flat" type="number" min="0" className="field" value={f.rateCard.flatPerDay} onChange={(e) => set({ rateCard: { ...f.rateCard, flatPerDay: e.target.value } })} /></Field>
          <Field id="pl-cpm" label="Per 1,000 impressions"><input id="pl-cpm" type="number" min="0" className="field" value={f.rateCard.cpm} onChange={(e) => set({ rateCard: { ...f.rateCard, cpm: e.target.value } })} /></Field>
          <Field id="pl-cpc" label="Per click"><input id="pl-cpc" type="number" min="0" className="field" value={f.rateCard.cpc} onChange={(e) => set({ rateCard: { ...f.rateCard, cpc: e.target.value } })} /></Field>
        </div>
      </fieldset>
      <label htmlFor="pl-active" className="flex cursor-pointer items-center gap-3 rounded-2xl border border-sand p-3 hover:bg-paper">
        <input id="pl-active" type="checkbox" checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="h-5 w-5 accent-[#B5232C]" />
        <span className="text-sm font-semibold text-ink">Active (on sale and served)</span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={busy || !f.surfaces.length || !f.formats.length} className="btn btn-primary">{busy ? 'Saving…' : 'Save placement'}</button>
      </div>
    </form>
  );
};

/** Ad placements and rate cards. Editing needs canReviewAds; others read only. */
const AdPlacementsTab = ({ refreshKey = 0 }) => {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // placement or 'new'
  const canEdit = can('canReviewAds');

  const load = useCallback(() => {
    API.get('/ads/admin/placements')
      .then((r) => setList(r.data.data || []))
      .catch((e) => {
        setList([]);
        showToast(errMsg(e, 'Could not load placements'), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const save = async (body) => {
    try {
      const res = editing === 'new' ? await API.post('/ads/admin/placements', body) : await API.put(`/ads/admin/placements/${editing._id}`, body);
      showToast(res.data.message || 'Placement saved', 'success');
      setEditing(null);
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not save the placement'), 'error');
    }
  };

  const setActive = async (p, isActive) => {
    try {
      const res = await API.put(`/ads/admin/placements/${p._id}`, { isActive });
      showToast(res.data.message || 'Saved', 'success');
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not update the placement'), 'error');
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete the placement “${p.name}”? This cannot be undone.`)) return;
    try {
      const res = await API.delete(`/ads/admin/placements/${p._id}`);
      showToast(res.data.message || 'Placement deleted', 'success');
      load();
    } catch (e) {
      if (e?.response?.status === 409 && p.isActive && window.confirm(`${errMsg(e, 'Campaigns use this placement.')}\n\nDeactivate it now instead?`)) {
        setActive(p, false);
        return;
      }
      showToast(errMsg(e, 'Could not delete the placement'), 'error');
    }
  };

  return (
    <Panel
      title="Ad placements & rate cards"
      count={list ? list.length : undefined}
      description="Where ads can appear and what each costs. Advertisers see active placements and their rate cards."
      actions={canEdit && <button type="button" onClick={() => setEditing('new')} className={BTN_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> New placement</button>}
    >
      {!canEdit && <p className="border-b border-sand bg-paper px-5 py-3 text-sm text-muted">Read only — changing placements needs the ad reviewer permission.</p>}
      {list === null ? (
        <Loading>Loading placements…</Loading>
      ) : list.length === 0 ? (
        <Empty icon={LayoutTemplate}>No placements yet.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Placement</th>
                <th className="px-4 py-3 font-semibold">Formats · size</th>
                <th className="px-4 py-3 font-semibold">Rate card</th>
                <th className="px-4 py-3 font-semibold">In use</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {list.map((p) => (
                <tr key={p._id} className="hover:bg-paper">
                  <td className="max-w-[18rem] px-4 py-3">
                    <span className="block font-semibold text-ink">{p.name}</span>
                    <span className="block font-mono text-xs text-muted">{p.key}</span>
                    {!RENDERED_KEYS.includes(p.key) && <span className="mt-1 block text-xs text-marigold-text">No slot on the website renders this key yet.</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {(p.formats || []).map((f) => FORMAT_LABELS[f]).join(', ')}
                    <span className="block text-xs text-muted">{p.width}×{p.height}px · up to {p.maxAds} ad{p.maxAds === 1 ? '' : 's'} · {(p.surfaces || []).map((s) => SURFACE_LABELS[s]).join(' + ')}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">
                    <span className="block">{p.rateCard?.flatPerDay ? `${nprAd(p.rateCard.flatPerDay)} / day` : 'No flat price'}</span>
                    <span className="block">{p.rateCard?.cpm ? `${nprAd(p.rateCard.cpm)} CPM` : 'No CPM'} · {p.rateCard?.cpc ? `${nprAd(p.rateCard.cpc)} CPC` : 'No CPC'}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.activeCampaigns || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`chip ${p.isActive ? 'bg-pine-tint text-pine' : 'bg-paper-deep text-muted'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setEditing(p)} className={ICON_BTN} aria-label={`Edit ${p.name}`}><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => setActive(p, !p.isActive)} className={BTN_GHOST}>
                          <Power className="h-4 w-4" aria-hidden="true" /> {p.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => remove(p)} className={BTN_DANGER} aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'New placement' : `Edit ${editing.name}`} icon={LayoutTemplate} onClose={() => setEditing(null)} size="max-w-2xl">
          <PlacementForm
            initial={editing === 'new' ? blank() : { ...blank(), ...editing, rateCard: { ...blank().rateCard, ...(editing.rateCard || {}) } }}
            keyLocked={editing !== 'new' && (editing.activeCampaigns > 0 || RENDERED_KEYS.includes(editing.key))}
            onCancel={() => setEditing(null)}
            onSave={save}
          />
        </Modal>
      )}
    </Panel>
  );
};

export default AdPlacementsTab;
