import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { X } from 'lucide-react-native';
import API from '../../lib/api';
import { humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Avatar, Chip, Field, Row, T } from '../ui';
import {
  CAMPAIGN_TYPES,
  DELIVERABLE_TYPES,
  OPP_STATUSES,
  RESOURCE_TYPES,
  DateField,
  MoneyField,
  PickChips,
  RowListEditor,
  UrlField,
  digits,
  intOr0,
  isDateInput,
  isHttpUrl,
  lines,
  toDateInput,
} from './AdminSponsorKit';

// Create / edit form for a sponsorship opportunity. `mode`:
//  'create'    manager creating (status DRAFT/OPEN, organisers, starting tier templates)
//  'manager'   manager editing (all statuses, organisers)
//  'organizer' organiser editing details only (no status, no organisers — the server ignores them)

export const blankOpportunity = () => ({
  title: '',
  campaignType: 'CLEANUP',
  summary: '',
  description: '',
  objectives: '',
  coverImage: '',
  location: '',
  startDate: '',
  endDate: '',
  schedule: '',
  audienceCount: '',
  audienceDescription: '',
  fundingGoal: '',
  resourceNeeds: [],
  deliverablesTemplate: [],
  organizers: [], // [{ _id, name, profilePicture }]
  status: 'DRAFT',
  tierTemplateIds: [],
});

export const opportunityToForm = (o) => ({
  ...blankOpportunity(),
  title: o.title || '',
  campaignType: o.campaignType || 'OTHER',
  summary: o.summary || '',
  description: o.description || '',
  objectives: (o.objectives || []).join('\n'),
  coverImage: o.coverImage || '',
  location: o.location || '',
  startDate: toDateInput(o.startDate),
  endDate: toDateInput(o.endDate),
  schedule: o.schedule || '',
  audienceCount: o.expectedAudience?.count ? String(o.expectedAudience.count) : '',
  audienceDescription: o.expectedAudience?.description || '',
  fundingGoal: o.fundingGoal ? String(o.fundingGoal) : '',
  resourceNeeds: (o.resourceNeeds || []).map((r) => ({ ...r, quantity: r.quantity ? String(r.quantity) : '' })),
  deliverablesTemplate: (o.deliverablesTemplate || []).map((d) => ({ ...d, dueOffsetDays: String(d.dueOffsetDays ?? 0) })),
  organizers: (o.organizers || []).map((u) => (typeof u === 'object' ? u : { _id: u, name: 'Member' })),
  status: o.status || 'DRAFT',
});

// Returns an error string, or null when the form can be sent.
export const validateOpportunity = (f) => {
  if (!f.title.trim()) return 'Title is required';
  if (f.coverImage && !isHttpUrl(f.coverImage)) return 'Cover image must be an http(s) link';
  if (!isDateInput(f.startDate) || !isDateInput(f.endDate)) return 'Dates must look like 2026-11-20';
  if (f.startDate && f.endDate && f.endDate < f.startDate) return 'End date must be after the start date';
  if (f.resourceNeeds.some((r) => !String(r.description || '').trim())) return 'Each resource need needs a description';
  if (f.deliverablesTemplate.some((d) => !String(d.title || '').trim())) return 'Each deliverable needs a title';
  return null;
};

export const opportunityPayload = (f, mode) => {
  const body = {
    title: f.title.trim(),
    campaignType: f.campaignType,
    summary: f.summary.trim(),
    description: f.description.trim(),
    objectives: lines(f.objectives),
    coverImage: f.coverImage.trim(),
    location: f.location.trim(),
    startDate: f.startDate || null,
    endDate: f.endDate || null,
    schedule: f.schedule.trim(),
    expectedAudience: { count: intOr0(f.audienceCount), description: f.audienceDescription.trim() },
    fundingGoal: intOr0(f.fundingGoal),
    resourceNeeds: f.resourceNeeds.map((r) => ({ type: r.type, description: String(r.description).trim(), quantity: intOr0(r.quantity), unit: String(r.unit || '').trim() })),
    deliverablesTemplate: f.deliverablesTemplate.map((d) => ({ title: String(d.title).trim(), type: d.type, dueOffsetDays: Math.round(Number(d.dueOffsetDays) || 0) })),
  };
  if (mode !== 'organizer') {
    body.status = f.status;
    body.organizers = f.organizers.map((u) => u._id);
  }
  if (mode === 'create') body.tierTemplateIds = f.tierTemplateIds;
  return body;
};

// Organiser picker over the public members list (GET /auth/members).
const OrganizerPicker = ({ value, onChange }) => {
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    API.get('/auth/members').then((res) => { if (res.data?.success) setMembers(res.data.data || []); }).catch(() => {});
  }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return members.filter((m) => !value.some((v) => v._id === m._id) && String(m.name || '').toLowerCase().includes(s)).slice(0, 8);
  }, [q, members, value]);
  return (
    <View style={{ gap: 8 }}>
      <T variant="semibold" style={{ fontSize: 14.5 }}>Organisers</T>
      <T variant="small">Organisers can edit details, move deals through review, message sponsors and track deliverables for this campaign. They never see money.</T>
      {value.length ? (
        <Row wrap gap={8}>
          {value.map((u) => (
            <Chip key={u._id} label={u.name} icon={X} active onPress={() => onChange(value.filter((x) => x._id !== u._id))} />
          ))}
        </Row>
      ) : (
        <T variant="small" style={{ color: colors.muted }}>No organisers yet.</T>
      )}
      <Field value={q} onChangeText={setQ} placeholder="Search members by name…" autoCorrect={false} accessibilityLabel="Search members to add as organisers" />
      {results.map((m) => (
        <Row
          key={m._id}
          gap={10}
          style={{ paddingVertical: 6 }}
        >
          <Avatar name={m.name} src={m.profilePicture} size="sm" />
          <T variant="medium" style={{ flex: 1 }} numberOfLines={1}>{m.name}</T>
          <Chip label="Add" onPress={() => { onChange([...value, { _id: m._id, name: m.name, profilePicture: m.profilePicture }]); setQ(''); }} />
        </Row>
      ))}
      {q.trim() && !results.length ? <T variant="small">No matching members.</T> : null}
    </View>
  );
};

export const OpportunityFields = ({ form, setForm, mode, templates = [] }) => {
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const statusOptions = mode === 'create' ? ['DRAFT', 'OPEN'] : OPP_STATUSES;
  return (
    <View style={{ gap: space.lg }}>
      <Field label="Title" value={form.title} onChangeText={set('title')} maxLength={160} />
      <PickChips label="Campaign type" options={CAMPAIGN_TYPES} value={form.campaignType} onChange={set('campaignType')} />
      <Field label="Summary" value={form.summary} onChangeText={set('summary')} maxLength={300} hint="One or two lines shown on cards." />
      <Field label="Description" value={form.description} onChangeText={set('description')} multiline maxLength={8000} />
      <Field label="Objectives" value={form.objectives} onChangeText={set('objectives')} multiline hint="One objective per line." />
      <UrlField label="Cover image URL" value={form.coverImage} onChangeText={set('coverImage')} />
      <Field label="Location" value={form.location} onChangeText={set('location')} maxLength={200} />
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><DateField label="Start date" value={form.startDate} onChangeText={set('startDate')} /></View>
        <View style={{ flex: 1 }}><DateField label="End date" value={form.endDate} onChangeText={set('endDate')} /></View>
      </Row>
      <Field label="Schedule" value={form.schedule} onChangeText={set('schedule')} multiline maxLength={2000} />
      <Field label="Expected audience (people)" value={form.audienceCount} onChangeText={(v) => set('audienceCount')(digits(v))} keyboardType="number-pad" />
      <Field label="Audience description" value={form.audienceDescription} onChangeText={set('audienceDescription')} maxLength={500} />
      <MoneyField label="Funding goal from sponsors (NPR)" value={form.fundingGoal} onChangeText={set('fundingGoal')} hint="Cash needed from sponsors (separate from public donations). 0 = no cash goal." />

      <RowListEditor
        title="Resource needs"
        hint="Materials, equipment, transport… that sponsors can contribute in kind."
        rows={form.resourceNeeds}
        onChange={set('resourceNeeds')}
        blank={{ type: 'MATERIALS', description: '', quantity: '', unit: '' }}
        addLabel="Add resource need"
        renderRow={(r, up) => (
          <>
            <PickChips label="Type" options={RESOURCE_TYPES} value={r.type} onChange={(type) => up({ type })} />
            <Field label="Description" value={r.description} onChangeText={(description) => up({ description })} maxLength={300} />
            <Row gap={12}>
              <View style={{ flex: 1 }}><Field label="Quantity" value={String(r.quantity ?? '')} onChangeText={(v) => up({ quantity: digits(v) })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Unit" value={r.unit} onChangeText={(unit) => up({ unit })} maxLength={30} /></View>
            </Row>
          </>
        )}
      />

      <RowListEditor
        title="Deliverables template"
        hint="Copied onto each deal when it is agreed. Due = days after the campaign ends (negative = before)."
        rows={form.deliverablesTemplate}
        onChange={set('deliverablesTemplate')}
        blank={{ title: '', type: 'OTHER', dueOffsetDays: '0' }}
        addLabel="Add deliverable"
        reorder
        renderRow={(d, up) => (
          <>
            <Field label="Title" value={d.title} onChangeText={(title) => up({ title })} maxLength={200} />
            <PickChips label="Type" options={DELIVERABLE_TYPES} value={d.type} onChange={(type) => up({ type })} />
            <Field
              label="Due (days after the campaign ends)"
              value={String(d.dueOffsetDays ?? '')}
              onChangeText={(v) => up({ dueOffsetDays: v.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '') })}
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}
      />

      {mode !== 'organizer' ? <OrganizerPicker value={form.organizers} onChange={set('organizers')} /> : null}
      {mode !== 'organizer' ? (
        <PickChips label="Status" options={statusOptions} value={form.status} onChange={set('status')} />
      ) : null}
      {mode === 'create' && templates.length ? (
        <View style={{ gap: 8 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }}>Start with tier templates</T>
          <T variant="small">Selected templates are copied onto this campaign; you can change their prices afterwards.</T>
          <Row wrap gap={8}>
            {templates.filter((t) => t.isActive).map((t) => {
              const on = form.tierTemplateIds.includes(t._id);
              return (
                <Chip
                  key={t._id}
                  label={`${t.name} · ${humanize(t.level)}`}
                  active={on}
                  onPress={() => set('tierTemplateIds')(on ? form.tierTemplateIds.filter((x) => x !== t._id) : [...form.tierTemplateIds, t._id])}
                />
              );
            })}
          </Row>
        </View>
      ) : null}
    </View>
  );
};
