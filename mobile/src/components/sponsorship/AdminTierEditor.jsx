import React, { useState } from 'react';
import { View } from 'react-native';
import { Copy, EyeOff, Eye, Layers, Pencil, Plus, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { confirm } from '../../lib/confirm';
import { humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Button, Chip, EmptyState, ErrorState, Field, Loading, Row, StatusChip, T } from '../ui';
import { LOGO_SIZES, TIER_LEVELS, Box, MoneyField, PickChips, digits, intOr0, lines, priceText, useSponsorApi } from './AdminSponsorKit';
import { ToggleRow } from '../admin/people/PeopleKit';

// Tier packages for one opportunity (`scope` = opportunity id) or the reusable
// template library (`scope` = 'templates'). Prices are always set by staff —
// the standard set is created at Rs. 0 for the admin to fill in.
const STANDARD_SET = [
  { name: 'Title Sponsor', level: 'TITLE', logoSize: 'XL', slots: 1, order: 1 },
  { name: 'Gold Sponsor', level: 'GOLD', logoSize: 'L', slots: 0, order: 2 },
  { name: 'Silver Sponsor', level: 'SILVER', logoSize: 'M', slots: 0, order: 3 },
  { name: 'Community Partner', level: 'COMMUNITY_PARTNER', logoSize: 'S', slots: 0, order: 4 },
  { name: 'Media Partner', level: 'MEDIA_PARTNER', logoSize: 'M', slots: 0, order: 5 },
  { name: 'In-Kind Partner', level: 'IN_KIND', logoSize: 'S', slots: 0, order: 6 },
];

const blankTier = () => ({ name: '', level: 'CUSTOM', description: '', price: '', priceNote: '', benefits: '', logoSize: 'M', slots: '1', order: '0', isActive: true });
const tierToForm = (t) => ({
  name: t.name || '',
  level: t.level || 'CUSTOM',
  description: t.description || '',
  price: t.price ? String(t.price) : '',
  priceNote: t.priceNote || '',
  benefits: (t.benefits || []).join('\n'),
  logoSize: t.logoSize || 'M',
  slots: String(t.slots ?? 1),
  order: String(t.order ?? 0),
  isActive: t.isActive !== false,
});
const tierPayload = (f) => ({
  name: f.name.trim(),
  level: f.level,
  description: f.description.trim(),
  price: intOr0(f.price),
  priceNote: f.priceNote.trim(),
  benefits: lines(f.benefits),
  logoSize: f.logoSize,
  slots: intOr0(f.slots),
  order: Math.round(Number(f.order) || 0),
  isActive: !!f.isActive,
});
const copyOf = (t) => ({
  name: t.name, level: t.level, description: t.description, price: t.price, priceNote: t.priceNote,
  benefits: t.benefits, logoSize: t.logoSize, slots: t.slots, order: t.order, isActive: true,
});

export default function AdminTierEditor({ scope, showToast }) {
  const isTemplates = scope === 'templates';
  const { data, loading, error, reload } = useSponsorApi(scope ? `/sponsorship/tiers?opportunity=${scope}` : null, { fallback: 'Could not load tiers.' });
  const templatesApi = useSponsorApi(!isTemplates && scope ? '/sponsorship/tiers?opportunity=templates' : null);
  const tiers = data || [];
  const [editing, setEditing] = useState(null); // null | 'new' | tier
  const [form, setForm] = useState(blankTier());
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(blankTier()); setEditing('new'); };
  const openEdit = (t) => { setForm(tierToForm(t)); setEditing(t); };

  const save = async () => {
    if (!form.name.trim()) return showToast('Tier name is required', 'error');
    setSaving(true);
    try {
      const body = tierPayload(form);
      const res = editing === 'new'
        ? await API.post('/sponsorship/tiers', { ...body, ...(isTemplates ? {} : { opportunity: scope }) })
        : await API.put(`/sponsorship/tiers/${editing._id}`, body);
      showToast(res.data?.message || 'Tier saved', 'success');
      setEditing(null);
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the tier'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (t, isActive) => {
    setBusy(t._id);
    try {
      await API.put(`/sponsorship/tiers/${t._id}`, { isActive });
      showToast(isActive ? `${t.name} is active again` : `${t.name} deactivated`, 'success');
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not update the tier'), 'error');
    } finally {
      setBusy('');
    }
  };

  const remove = async (t) => {
    if (!(await confirm(`Delete "${t.name}"?`, 'If any deal uses this tier it is hidden instead of deleted.', { confirmText: 'Delete' }))) return;
    setBusy(t._id);
    try {
      const res = await API.delete(`/sponsorship/tiers/${t._id}`);
      showToast(res.data?.message || 'Tier deleted', 'success');
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete the tier'), 'error');
    } finally {
      setBusy('');
    }
  };

  const addStandardSet = async () => {
    if (!(await confirm('Add the standard tier set?', 'Creates Title, Gold, Silver, Community Partner, Media Partner and In-Kind templates at Rs. 0. Set real prices before copying them onto campaigns.', { confirmText: 'Add templates', destructive: false }))) return;
    setBusy('standard');
    try {
      for (const t of STANDARD_SET) {
        // eslint-disable-next-line no-await-in-loop
        await API.post('/sponsorship/tiers', { ...t, price: 0, priceNote: '', benefits: [], description: '', isActive: true });
      }
      showToast('Standard templates added — set their prices', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not add all templates'), 'error');
    } finally {
      setBusy('');
      reload();
    }
  };

  const copyTemplate = async (t) => {
    setBusy(`copy-${t._id}`);
    try {
      await API.post('/sponsorship/tiers', { ...copyOf(t), opportunity: scope });
      showToast(`${t.name} added to this campaign`, 'success');
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not copy the template'), 'error');
    } finally {
      setBusy('');
    }
  };

  if (editing) {
    return (
      <View style={{ gap: space.lg }}>
        <T variant="h3">{editing === 'new' ? (isTemplates ? 'New tier template' : 'New tier') : `Edit ${editing.name}`}</T>
        <Field label="Name" value={form.name} onChangeText={set('name')} maxLength={80} />
        <PickChips label="Level" options={TIER_LEVELS} value={form.level} onChange={set('level')} />
        <Field label="Description" value={form.description} onChangeText={set('description')} multiline maxLength={1000} />
        <MoneyField label="Price (NPR)" value={form.price} onChangeText={set('price')} hint="0 = in-kind or by quotation (explain in the price note)." />
        <Field label="Price note" value={form.priceNote} onChangeText={set('priceNote')} maxLength={120} placeholder="e.g. or equivalent in materials" />
        <Field label="Benefits" value={form.benefits} onChangeText={set('benefits')} multiline hint="One benefit per line." />
        <PickChips label="Logo size on artwork" options={LOGO_SIZES} value={form.logoSize} onChange={set('logoSize')} />
        <Row gap={12}>
          <View style={{ flex: 1 }}><Field label="Slots" value={form.slots} onChangeText={(v) => set('slots')(digits(v))} keyboardType="number-pad" hint="0 = unlimited" /></View>
          <View style={{ flex: 1 }}><Field label="Display order" value={form.order} onChangeText={(v) => set('order')(v.replace(/[^0-9-]/g, ''))} keyboardType="numbers-and-punctuation" /></View>
        </Row>
        <ToggleRow title="Active" hint={isTemplates ? 'Inactive templates are hidden when creating campaigns.' : 'Inactive tiers are hidden from sponsors.'} value={form.isActive} onValueChange={set('isActive')} />
        <Row gap={8}>
          <Button title="Cancel" variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
          <Button title="Save tier" onPress={save} loading={saving} style={{ flex: 1 }} />
        </Row>
      </View>
    );
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={() => reload()} />;

  const templates = (templatesApi.data || []).filter((t) => t.isActive);

  return (
    <View style={{ gap: space.md }}>
      <Row wrap gap={8}>
        <Button title={isTemplates ? 'New template' : 'New tier'} icon={Plus} size="sm" onPress={openNew} />
        {isTemplates ? <Button title="Add standard tier set" icon={Layers} variant="soft" size="sm" onPress={addStandardSet} loading={busy === 'standard'} /> : null}
      </Row>
      {!isTemplates && templates.length ? (
        <Box tone="paper">
          <T variant="semibold">Copy from templates</T>
          <Row wrap gap={8}>
            {templates.map((t) => (
              <Chip key={t._id} icon={Copy} label={`${t.name}${t.price ? '' : ' (no price)'}`} onPress={busy ? undefined : () => copyTemplate(t)} />
            ))}
          </Row>
        </Box>
      ) : null}
      {!tiers.length ? (
        <EmptyState
          icon={Layers}
          title={isTemplates ? 'No tier templates yet' : 'No tiers for this campaign'}
          message={isTemplates ? 'Add the standard set or create your own reusable packages.' : 'Add tiers so sponsors can choose a package, or let them send custom proposals.'}
        />
      ) : null}
      {tiers.map((t) => (
        <Box key={t._id} style={{ opacity: t.isActive ? 1 : 0.7 }}>
          <Row style={{ justifyContent: 'space-between' }} gap={8}>
            <T variant="semibold" style={{ flex: 1 }}>{t.name}</T>
            {!t.isActive ? <StatusChip status="CANCELLED" label="Inactive" /> : null}
          </Row>
          <T variant="small">
            {humanize(t.level)} · {priceText(t)}
            {t.price > 0 && t.priceNote ? ` (${t.priceNote})` : ''} · Logo {t.logoSize}
          </T>
          <T variant="small" style={{ color: colors.muted }}>
            {t.slots === 0 ? `Unlimited slots · ${t.slotsTaken || 0} taken` : `${t.slotsTaken || 0} of ${t.slots} slot${t.slots === 1 ? '' : 's'} taken`}
            {t.price === 0 && !t.priceNote ? ' · price not set' : ''}
          </T>
          {t.benefits?.length ? <T variant="small">• {t.benefits.join('\n• ')}</T> : null}
          <Row wrap gap={8}>
            <Button title="Edit" icon={Pencil} variant="ghost" size="sm" onPress={() => openEdit(t)} />
            {t.isActive ? (
              <Button title="Deactivate" icon={EyeOff} variant="soft" size="sm" loading={busy === t._id} onPress={() => setActive(t, false)} />
            ) : (
              <Button title="Activate" icon={Eye} variant="soft" size="sm" loading={busy === t._id} onPress={() => setActive(t, true)} />
            )}
            <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => remove(t)} />
          </Row>
        </Box>
      ))}
    </View>
  );
}
