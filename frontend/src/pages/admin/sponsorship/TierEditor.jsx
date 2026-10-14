import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Layers, EyeOff, Eye } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import {
  SP, TIER_LEVELS, LOGO_SIZES, label, npr, errMsg, Chip, Empty, Loading, Field, Select, ListEditor, Modal,
  BTN_PRIMARY, BTN_GHOST, ICON_BTN,
} from './shared';

// The standard package names. Prices are deliberately 0 ("set by the team"):
// the admin fills in real prices and benefits before opening the campaign.
const STANDARD_SET = [
  { name: 'Title Sponsor', level: 'TITLE', logoSize: 'XL', slots: 1 },
  { name: 'Gold Partner', level: 'GOLD', logoSize: 'L', slots: 0 },
  { name: 'Silver Partner', level: 'SILVER', logoSize: 'M', slots: 0 },
  { name: 'Community Partner', level: 'COMMUNITY_PARTNER', logoSize: 'S', slots: 0 },
  { name: 'Media Partner', level: 'MEDIA_PARTNER', logoSize: 'M', slots: 0 },
  { name: 'In-Kind Partner', level: 'IN_KIND', logoSize: 'S', slots: 0, priceNote: 'In-kind contribution (goods or services)' },
];
const PLACEHOLDER_BENEFITS = ['[Benefit 1 — edit before publishing]', '[Benefit 2 — edit before publishing]'];

const emptyTier = (order = 0) => ({
  name: '', level: 'CUSTOM', description: '', price: 0, priceNote: '', benefits: [], logoSize: 'M', slots: 1, order, isActive: true,
});

const priceText = (t) => (t.price > 0 ? npr(t.price) : t.priceNote || 'By quotation');

const TierForm = ({ initial, onCancel, onSave, idPrefix }) => {
  const [f, setF] = useState({ ...emptyTier(), ...initial, benefits: initial?.benefits || [] });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        name: f.name, level: f.level, description: f.description, price: Number(f.price) || 0, priceNote: f.priceNote,
        benefits: f.benefits.map((b) => b.trim()).filter(Boolean), logoSize: f.logoSize, slots: Number(f.slots) || 0, isActive: f.isActive, order: f.order,
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-name`} label="Package name">
          <input id={`${idPrefix}-name`} required maxLength={80} value={f.name} onChange={(e) => set('name')(e.target.value)} className="field" />
        </Field>
        <Field id={`${idPrefix}-level`} label="Level">
          <Select id={`${idPrefix}-level`} value={f.level} onChange={set('level')} options={TIER_LEVELS} />
        </Field>
        <Field id={`${idPrefix}-price`} label="Price (whole NPR)" hint="0 = in-kind or by quotation — then explain in the price note.">
          <input id={`${idPrefix}-price`} type="number" min="0" step="1" value={f.price} onChange={(e) => set('price')(e.target.value)} className="field" />
        </Field>
        <Field id={`${idPrefix}-note`} label="Price note" hint='e.g. "or equivalent in materials"'>
          <input id={`${idPrefix}-note`} maxLength={120} value={f.priceNote} onChange={(e) => set('priceNote')(e.target.value)} className="field" />
        </Field>
        <Field id={`${idPrefix}-slots`} label="Slots" hint="0 = unlimited">
          <input id={`${idPrefix}-slots`} type="number" min="0" step="1" value={f.slots} onChange={(e) => set('slots')(e.target.value)} className="field" />
        </Field>
        <Field id={`${idPrefix}-logo`} label="Logo size on artwork">
          <Select id={`${idPrefix}-logo`} value={f.logoSize} onChange={set('logoSize')} options={LOGO_SIZES} />
        </Field>
      </div>
      <Field id={`${idPrefix}-desc`} label="Description">
        <textarea id={`${idPrefix}-desc`} rows={2} maxLength={1000} value={f.description} onChange={(e) => set('description')(e.target.value)} className="field" />
      </Field>
      <fieldset>
        <legend className="field-label">Benefits</legend>
        <ListEditor idPrefix={`${idPrefix}-benefit`} items={f.benefits} onChange={set('benefits')} placeholder="Benefit" addLabel="Add benefit" />
      </fieldset>
      <label className="flex items-center gap-3 text-sm font-semibold text-ink-soft">
        <input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive')(e.target.checked)} className="h-5 w-5 accent-[#B5232C]" />
        Offered to sponsors (active)
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save package'}</button>
      </div>
    </form>
  );
};

/**
 * Tier (package) editor for one opportunity, or for the template library
 * when `opportunityId` is null.
 */
const TierEditor = ({ opportunityId = null }) => {
  const { showToast } = useToast();
  const scope = opportunityId || 'templates';
  const [tiers, setTiers] = useState(null);
  const [editing, setEditing] = useState(null); // tier object or {} for new
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`${SP}/tiers`, { params: { opportunity: scope } });
      setTiers(res.data.data || []);
    } catch (e) {
      setTiers([]);
      showToast(errMsg(e, 'Could not load packages'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (body) => {
    try {
      if (editing?._id) {
        const res = await API.put(`${SP}/tiers/${editing._id}`, body);
        showToast(res.data.message || 'Package updated', 'success');
      } else {
        const order = tiers?.length ? Math.max(...tiers.map((t) => t.order || 0)) + 1 : 0;
        const res = await API.post(`${SP}/tiers`, { ...body, order, ...(opportunityId ? { opportunity: opportunityId } : {}) });
        showToast(res.data.message || 'Package created', 'success');
      }
      setEditing(null);
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not save the package'), 'error');
    }
  };

  const toggleActive = async (t) => {
    try {
      await API.put(`${SP}/tiers/${t._id}`, { isActive: !t.isActive });
      showToast(t.isActive ? `${t.name} hidden from sponsors` : `${t.name} offered again`, 'success');
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not change the package'), 'error');
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete the "${t.name}" package? If deals already use it, it will be hidden instead.`)) return;
    try {
      const res = await API.delete(`${SP}/tiers/${t._id}`);
      showToast(res.data.message || 'Package deleted', 'success');
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not delete the package'), 'error');
    }
  };

  // Swap with the neighbour and renumber everything so orders stay unique
  const move = async (index, dir) => {
    const list = [...tiers];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setTiers(list.map((t, i) => ({ ...t, order: i })));
    try {
      await Promise.all(list.map((t, i) => (t.order !== i ? API.put(`${SP}/tiers/${t._id}`, { order: i }) : null)));
    } catch (e) {
      showToast(errMsg(e, 'Could not reorder'), 'error');
    }
    load();
  };

  const addStandardSet = async () => {
    if (!window.confirm('Add the six standard packages (Title, Gold, Silver, Community, Media, In-Kind)? They start with price 0 and placeholder benefits for you to fill in.')) return;
    setBusy(true);
    const start = tiers?.length ? Math.max(...tiers.map((t) => t.order || 0)) + 1 : 0;
    try {
      for (const [i, t] of STANDARD_SET.entries()) {
        // sequential so the order stays predictable
        // eslint-disable-next-line no-await-in-loop
        await API.post(`${SP}/tiers`, {
          ...t,
          price: 0,
          priceNote: t.priceNote || 'Price to be set',
          benefits: PLACEHOLDER_BENEFITS,
          description: '',
          order: start + i,
          isActive: true,
          ...(opportunityId ? { opportunity: opportunityId } : {}),
        });
      }
      showToast('Standard packages added — set prices and benefits before publishing', 'success');
    } catch (e) {
      showToast(errMsg(e, 'Could not add all packages'), 'error');
    } finally {
      setBusy(false);
      load();
    }
  };

  const hasPlaceholders = (t) => (t.benefits || []).some((b) => b.startsWith('[')) || (t.price === 0 && t.priceNote === 'Price to be set');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {opportunityId ? 'Packages sponsors can choose for this campaign.' : 'Reusable packages. Pick them when creating a new opportunity.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addStandardSet} disabled={busy} className={BTN_GHOST}>
            <Layers className="h-4 w-4" aria-hidden="true" /> {busy ? 'Adding…' : 'Add standard tier set'}
          </button>
          <button type="button" onClick={() => setEditing({})} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New package
          </button>
        </div>
      </div>

      {tiers === null ? (
        <Loading />
      ) : tiers.length === 0 ? (
        <Empty icon={Layers}>No packages yet. Add the standard set or create one.</Empty>
      ) : (
        <ul className="space-y-2.5">
          {tiers.map((t, i) => (
            <li key={t._id} className={`rounded-2xl border border-sand bg-white p-3.5 sm:p-4 ${t.isActive ? '' : 'opacity-70'}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{t.name}</p>
                    <span className="chip bg-paper-deep text-ink-soft">{label(t.level)}</span>
                    {!t.isActive && <span className="chip bg-paper-deep text-muted">Hidden</span>}
                    {hasPlaceholders(t) && <Chip status="PENDING">Needs price/benefits</Chip>}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="font-semibold tabular-nums">{priceText(t)}</span>
                    {t.price > 0 && t.priceNote ? <span className="text-muted"> · {t.priceNote}</span> : null}
                    <span className="text-muted"> · Logo {label(t.logoSize)} · </span>
                    <span className="text-muted">
                      {t.slots === 0 ? 'Unlimited slots' : `${t.slotsTaken || 0}/${t.slots} slots taken`}
                    </span>
                  </p>
                  {t.benefits?.length > 0 && (
                    <ul className="mt-1.5 list-inside list-disc text-sm text-muted">
                      {t.benefits.slice(0, 4).map((b, k) => (
                        <li key={k} className="truncate">{b}</li>
                      ))}
                      {t.benefits.length > 4 && <li className="list-none text-xs">+{t.benefits.length - 4} more</li>}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={ICON_BTN} aria-label={`Move ${t.name} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === tiers.length - 1} className={ICON_BTN} aria-label={`Move ${t.name} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => toggleActive(t)} className={ICON_BTN} aria-label={t.isActive ? `Hide ${t.name}` : `Offer ${t.name} again`} title={t.isActive ? 'Hide from sponsors' : 'Offer again'}>
                    {t.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setEditing(t)} className={ICON_BTN} aria-label={`Edit ${t.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(t)} className={`${ICON_BTN} hover:!bg-brand-tint hover:!text-brand`} aria-label={`Delete ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.name}` : 'New package'} icon={Layers} size="max-w-2xl" onClose={() => setEditing(null)}>
          <TierForm initial={editing._id ? editing : emptyTier()} idPrefix={`tier-${editing._id || 'new'}`} onCancel={() => setEditing(null)} onSave={save} />
        </Modal>
      )}
    </div>
  );
};

export default TierEditor;
