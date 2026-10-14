import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Search, X } from 'lucide-react';
import API from '../../../services/api';
import Avatar from '../../../components/ui/Avatar';
import {
  OPP_STATUSES, CAMPAIGN_TYPES, RESOURCE_TYPES, DELIVERABLE_TYPES, label, npr, toDateInput, idOf, isHttpUrl,
  Field, Select, ListEditor, UrlPreview, BTN_GHOST, ICON_BTN,
} from './shared';

const blank = {
  title: '', campaignType: 'CLEANUP', summary: '', description: '', objectives: [], coverImage: '', location: '',
  startDate: '', endDate: '', schedule: '', expectedAudience: { count: 0, description: '' }, fundingGoal: 0,
  resourceNeeds: [], deliverablesTemplate: [], event: '', donationCampaign: '', organizers: [], status: 'DRAFT',
};

const fromOpportunity = (o) => ({
  ...blank,
  ...o,
  startDate: toDateInput(o.startDate),
  endDate: toDateInput(o.endDate),
  expectedAudience: { count: o.expectedAudience?.count || 0, description: o.expectedAudience?.description || '' },
  objectives: o.objectives || [],
  resourceNeeds: (o.resourceNeeds || []).map(({ type, description, quantity, unit }) => ({ type, description, quantity, unit })),
  deliverablesTemplate: (o.deliverablesTemplate || []).map(({ type, title, dueOffsetDays }) => ({ type, title, dueOffsetDays })),
  event: idOf(o.event),
  donationCampaign: idOf(o.donationCampaign),
  organizers: (o.organizers || []).map((u) => (typeof u === 'object' ? { _id: u._id, name: u.name, profilePicture: u.profilePicture } : { _id: u, name: 'Member' })),
});

// Searchable member picker for campaign organisers
const OrganizerPicker = ({ value, onChange, idPrefix }) => {
  const [members, setMembers] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    API.get('/auth/members')
      .then((r) => setMembers(r.data.data || []))
      .catch(() => setMembers([]));
  }, []);
  const chosen = new Set(value.map((u) => String(u._id)));
  const matches = useMemo(() => {
    if (!members || q.trim().length < 2) return [];
    const s = q.toLowerCase();
    return members.filter((m) => !chosen.has(String(m._id)) && (m.name || '').toLowerCase().includes(s)).slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, q, value]);
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((u) => (
            <li key={u._id} className="inline-flex items-center gap-2 rounded-full border border-sand bg-white py-1 pl-1 pr-1.5 text-sm">
              <Avatar name={u.name} src={u.profilePicture} size="xs" />
              <span className="font-semibold text-ink">{u.name}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x._id !== u._id))} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink" aria-label={`Remove ${u.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <label htmlFor={`${idPrefix}-org-search`} className="sr-only">Find a member to add as organiser</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input id={`${idPrefix}-org-search`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={members === null ? 'Loading members…' : 'Type a member name (2+ letters)'} className="field !pl-10" autoComplete="off" />
      </div>
      {matches.length > 0 && (
        <ul className="divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white">
          {matches.map((m) => (
            <li key={m._id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...value, { _id: m._id, name: m.name, profilePicture: m.profilePicture }]);
                  setQ('');
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-paper"
              >
                <Avatar name={m.name} src={m.profilePicture} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-xs text-muted">{[label(m.memberLevel), m.location].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Create / edit an opportunity.
 * - `isManager` unlocks status, organisers and links to events/donation campaigns
 *   (organisers can edit details only — the server enforces the same).
 * - `templates` (create only): tier templates the admin may start from.
 */
const OpportunityForm = ({ opportunity, isManager, templates = [], onSubmit, onCancel, submitLabel = 'Save' }) => {
  const isNew = !opportunity?._id;
  const [f, setF] = useState(() => (opportunity ? fromOpportunity(opportunity) : blank));
  const [templateIds, setTemplateIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const pid = opportunity?._id || 'new';

  useEffect(() => {
    if (!isManager) return;
    API.get('/events').then((r) => setEvents(r.data.data || [])).catch(() => {});
    API.get('/donations/campaigns').then((r) => setCampaigns(r.data.data || [])).catch(() => {});
  }, [isManager]);

  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const setRow = (k, i, patch) => setF((p) => ({ ...p, [k]: p[k].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const removeRow = (k, i) => setF((p) => ({ ...p, [k]: p[k].filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.coverImage && !isHttpUrl(f.coverImage)) return;
    const body = {
      title: f.title,
      campaignType: f.campaignType,
      summary: f.summary,
      description: f.description,
      objectives: f.objectives.map((s) => s.trim()).filter(Boolean),
      coverImage: f.coverImage.trim(),
      location: f.location,
      startDate: f.startDate || null,
      endDate: f.endDate || null,
      schedule: f.schedule,
      expectedAudience: { count: Number(f.expectedAudience.count) || 0, description: f.expectedAudience.description },
      fundingGoal: Number(f.fundingGoal) || 0,
      resourceNeeds: f.resourceNeeds.filter((r) => r.description.trim()).map((r) => ({ ...r, quantity: Number(r.quantity) || 0 })),
      deliverablesTemplate: f.deliverablesTemplate.filter((d) => d.title.trim()).map((d) => ({ ...d, dueOffsetDays: Number(d.dueOffsetDays) || 0 })),
    };
    if (isManager) {
      body.event = f.event || null;
      body.donationCampaign = f.donationCampaign || null;
      body.organizers = f.organizers.map((u) => u._id);
      body.status = f.status;
      if (isNew && templateIds.length) body.tierTemplateIds = templateIds;
    }
    setBusy(true);
    try {
      await onSubmit(body);
    } finally {
      setBusy(false);
    }
  };

  const statusOptions = isNew ? ['DRAFT', 'OPEN'] : OPP_STATUSES;

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Campaign</legend>
        <Field id={`${pid}-title`} label="Title">
          <input id={`${pid}-title`} required maxLength={160} value={f.title} onChange={(e) => set('title')(e.target.value)} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${pid}-type`} label="Campaign type">
            <Select id={`${pid}-type`} value={f.campaignType} onChange={set('campaignType')} options={CAMPAIGN_TYPES} />
          </Field>
          {isManager ? (
            <Field id={`${pid}-status`} label="Status" hint={isNew ? 'Drafts are only visible to staff and organisers.' : 'Sponsors see Open, Closed and Completed campaigns.'}>
              <Select id={`${pid}-status`} value={f.status} onChange={set('status')} options={statusOptions} />
            </Field>
          ) : (
            <div>
              <p className="field-label">Status</p>
              <p className="py-2 text-sm text-ink-soft">{label(f.status)} <span className="text-muted">(set by the sponsorship team)</span></p>
            </div>
          )}
        </div>
        <Field id={`${pid}-summary`} label="Short summary" hint="One or two sentences shown on cards (max 300 characters).">
          <textarea id={`${pid}-summary`} rows={2} maxLength={300} value={f.summary} onChange={(e) => set('summary')(e.target.value)} className="field" />
        </Field>
        <Field id={`${pid}-desc`} label="Full description">
          <textarea id={`${pid}-desc`} rows={5} maxLength={8000} value={f.description} onChange={(e) => set('description')(e.target.value)} className="field" />
        </Field>
        <fieldset>
          <legend className="field-label">Objectives</legend>
          <ListEditor idPrefix={`${pid}-obj`} items={f.objectives} onChange={set('objectives')} placeholder="Objective" addLabel="Add objective" max={20} />
        </fieldset>
        <Field id={`${pid}-cover`} label="Cover image link" hint="An http(s) image link (uploads are not available yet).">
          <input id={`${pid}-cover`} type="url" value={f.coverImage} onChange={(e) => set('coverImage')(e.target.value)} placeholder="https://…" className="field" />
          <UrlPreview url={f.coverImage} alt="Cover preview" className="h-40 w-full" />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Where & when</legend>
        <Field id={`${pid}-loc`} label="Location">
          <input id={`${pid}-loc`} maxLength={200} value={f.location} onChange={(e) => set('location')(e.target.value)} className="field" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${pid}-start`} label="Start date">
            <input id={`${pid}-start`} type="date" value={f.startDate} onChange={(e) => set('startDate')(e.target.value)} className="field" />
          </Field>
          <Field id={`${pid}-end`} label="End date">
            <input id={`${pid}-end`} type="date" min={f.startDate || undefined} value={f.endDate} onChange={(e) => set('endDate')(e.target.value)} className="field" />
          </Field>
        </div>
        <Field id={`${pid}-sched`} label="Schedule">
          <textarea id={`${pid}-sched`} rows={3} maxLength={2000} value={f.schedule} onChange={(e) => set('schedule')(e.target.value)} className="field" placeholder="Day-by-day plan, times, meeting points…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id={`${pid}-aud`} label="Expected audience">
            <input id={`${pid}-aud`} type="number" min="0" value={f.expectedAudience.count} onChange={(e) => set('expectedAudience')({ ...f.expectedAudience, count: e.target.value })} className="field" />
          </Field>
          <Field id={`${pid}-audd`} label="Who they are" className="sm:col-span-2">
            <input id={`${pid}-audd`} maxLength={500} value={f.expectedAudience.description} onChange={(e) => set('expectedAudience')({ ...f.expectedAudience, description: e.target.value })} className="field" />
          </Field>
        </div>
        <Field id={`${pid}-goal`} label="Sponsor funding goal (whole NPR)" hint={Number(f.fundingGoal) > 0 ? `${npr(f.fundingGoal)} — cash needed from sponsors, separate from donations.` : 'Leave 0 if there is no cash target.'}>
          <input id={`${pid}-goal`} type="number" min="0" step="1" value={f.fundingGoal} onChange={(e) => set('fundingGoal')(e.target.value)} className="field" />
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Resource needs</legend>
        {f.resourceNeeds.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-sand bg-white p-3 sm:grid-cols-[9rem_1fr_6rem_6rem_auto]">
            <Select aria-label={`Need ${i + 1} type`} value={r.type} onChange={(v) => setRow('resourceNeeds', i, { type: v })} options={RESOURCE_TYPES} />
            <input aria-label={`Need ${i + 1} description`} required maxLength={300} value={r.description} onChange={(e) => setRow('resourceNeeds', i, { description: e.target.value })} placeholder="e.g. Gloves and sacks" className="field col-span-2 sm:col-span-1" />
            <input aria-label={`Need ${i + 1} quantity`} type="number" min="0" value={r.quantity} onChange={(e) => setRow('resourceNeeds', i, { quantity: e.target.value })} placeholder="Qty" className="field" />
            <input aria-label={`Need ${i + 1} unit`} maxLength={30} value={r.unit} onChange={(e) => setRow('resourceNeeds', i, { unit: e.target.value })} placeholder="Unit" className="field" />
            <button type="button" onClick={() => removeRow('resourceNeeds', i)} className={ICON_BTN} aria-label={`Remove need ${i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set('resourceNeeds')([...f.resourceNeeds, { type: 'MATERIALS', description: '', quantity: 0, unit: '' }])} className={BTN_GHOST}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add resource need
        </button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Sponsor deliverables template</legend>
        <p className="text-sm text-muted">Copied onto each deal when it is agreed. Due = days after the campaign ends (negative = before).</p>
        {f.deliverablesTemplate.map((d, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl border border-sand bg-white p-3 sm:grid-cols-[1fr_11rem_7rem_auto]">
            <input aria-label={`Deliverable ${i + 1} title`} required maxLength={200} value={d.title} onChange={(e) => setRow('deliverablesTemplate', i, { title: e.target.value })} placeholder="e.g. Logo on volunteer vests" className="field col-span-2 sm:col-span-1" />
            <Select aria-label={`Deliverable ${i + 1} type`} value={d.type} onChange={(v) => setRow('deliverablesTemplate', i, { type: v })} options={DELIVERABLE_TYPES} />
            <input aria-label={`Deliverable ${i + 1} due offset in days`} type="number" min="-365" max="365" value={d.dueOffsetDays} onChange={(e) => setRow('deliverablesTemplate', i, { dueOffsetDays: e.target.value })} className="field" />
            <button type="button" onClick={() => removeRow('deliverablesTemplate', i)} className={ICON_BTN} aria-label={`Remove deliverable ${i + 1}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => set('deliverablesTemplate')([...f.deliverablesTemplate, { title: '', type: 'OTHER', dueOffsetDays: 0 }])} className={BTN_GHOST}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add deliverable
        </button>
      </fieldset>

      {isManager && (
        <fieldset className="space-y-4">
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Team & links</legend>
          <div>
            <p className="field-label">Organisers</p>
            <p className="mb-2 text-xs text-muted">Organisers can edit details, move deals, message sponsors, track deliverables and the brand kit for this campaign. They never see amounts.</p>
            <OrganizerPicker idPrefix={pid} value={f.organizers} onChange={set('organizers')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${pid}-event`} label="Linked event">
              <select id={`${pid}-event`} value={f.event} onChange={(e) => set('event')(e.target.value)} className="field">
                <option value="">None</option>
                {f.event && !events.some((ev) => ev._id === f.event) && <option value={f.event}>{opportunity?.event?.title || 'Current event'}</option>}
                {events.map((ev) => (
                  <option key={ev._id} value={ev._id}>{ev.title}</option>
                ))}
              </select>
            </Field>
            <Field id={`${pid}-camp`} label="Linked donation campaign">
              <select id={`${pid}-camp`} value={f.donationCampaign} onChange={(e) => set('donationCampaign')(e.target.value)} className="field">
                <option value="">None</option>
                {f.donationCampaign && !campaigns.some((c) => c._id === f.donationCampaign) && <option value={f.donationCampaign}>{opportunity?.donationCampaign?.title || 'Current campaign'}</option>}
                {campaigns.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>
      )}

      {isManager && isNew && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Start from package templates</legend>
          {templates.filter((t) => t.isActive).length === 0 ? (
            <p className="text-sm text-muted">No templates yet. You can create them in the template library, or add packages after saving.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.filter((t) => t.isActive).map((t) => (
                <label key={t._id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand bg-white p-3 hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={templateIds.includes(t._id)}
                    onChange={(e) => setTemplateIds((ids) => (e.target.checked ? [...ids, t._id] : ids.filter((x) => x !== t._id)))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#B5232C]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{t.name}</span>
                    <span className="block text-xs text-muted">{label(t.level)} · {t.price > 0 ? npr(t.price) : t.priceNote || 'By quotation'}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}

      <div className="sticky bottom-0 -mx-1 flex flex-col-reverse gap-2 border-t border-sand bg-white/95 px-1 pt-4 backdrop-blur sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
        )}
        <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
};

export default OpportunityForm;
