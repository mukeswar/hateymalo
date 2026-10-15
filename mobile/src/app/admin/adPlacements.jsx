import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { colors, space } from '../../theme';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, StatusChip, T } from '../../components/ui';
import { ToggleRow } from '../../components/admin/people/PeopleKit';
import { MoneyField, SmallIconButton, digits, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { AD_FORMATS, FORMAT_LABELS, SURFACES, SURFACE_LABELS, rateCardText } from '../../components/ads/AdBits';

const TITLE = findSection('adPlacements')?.label || 'Ad placements';
const KEY_RE = /^[a-z0-9]+(\.[a-z0-9_-]+)+$/;
const RENDERED = ['home.banner', 'feed.inline', 'content.footer', 'events.list'];

const blank = () => ({ key: '', name: '', description: '', surfaces: ['WEB', 'APP'], formats: ['IMAGE', 'NATIVE'], width: '', height: '', maxAds: '1', flatPerDay: '', cpm: '', cpc: '', isActive: true, order: '0' });
const toForm = (p) => ({
  key: p.key,
  name: p.name,
  description: p.description || '',
  surfaces: p.surfaces || [],
  formats: p.formats || [],
  width: p.width ? String(p.width) : '',
  height: p.height ? String(p.height) : '',
  maxAds: String(p.maxAds || 1),
  flatPerDay: p.rateCard?.flatPerDay ? String(p.rateCard.flatPerDay) : '',
  cpm: p.rateCard?.cpm ? String(p.rateCard.cpm) : '',
  cpc: p.rateCard?.cpc ? String(p.rateCard.cpc) : '',
  isActive: p.isActive !== false,
  order: String(p.order || 0),
});

const MultiPick = ({ label, options, labels, value, onChange }) => (
  <View style={{ gap: 8 }}>
    <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T>
    <Row wrap gap={8}>
      {options.map((o) => {
        const on = value.includes(o);
        return <Chip key={o} label={labels[o]} active={on} onPress={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} />;
      })}
    </Row>
  </View>
);

// Web: SuperAdminDashboard "adPlacements" tab. GET /ads/admin/placements; create / update / delete
// need canReviewAds. Keys of placements used by campaigns cannot be renamed or deleted.
export default function AdminAdPlacements() {
  const { showToast } = useToast();
  const { data, loading, refreshing, error, reload, refresh } = useSponsorApi('/ads/admin/placements', { fallback: 'Could not load placements.' });
  const [editing, setEditing] = useState(null); // { id|null, form }
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setEditing((e) => ({ ...e, form: { ...e.form, [k]: v } }));

  const save = async () => {
    const f = editing.form;
    if (!KEY_RE.test(f.key.trim().toLowerCase())) return showToast('Key must look like page.slot (lowercase letters, numbers, dots)', 'warning');
    if (!f.name.trim()) return showToast('Give the placement a name', 'warning');
    if (!f.surfaces.length || !f.formats.length) return showToast('Choose at least one surface and one format', 'warning');
    setSaving(true);
    try {
      const body = {
        key: f.key.trim().toLowerCase(),
        name: f.name.trim(),
        description: f.description.trim(),
        surfaces: f.surfaces,
        formats: f.formats,
        width: Number(f.width) || 0,
        height: Number(f.height) || 0,
        maxAds: Math.min(5, Math.max(1, Number(f.maxAds) || 1)),
        rateCard: { flatPerDay: Number(f.flatPerDay) || 0, cpm: Number(f.cpm) || 0, cpc: Number(f.cpc) || 0 },
        isActive: !!f.isActive,
        order: Number(f.order) || 0,
      };
      const res = editing.id ? await API.put(`/ads/admin/placements/${editing.id}`, body) : await API.post('/ads/admin/placements', body);
      showToast(res.data?.message || 'Placement saved', 'success');
      setEditing(null);
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the placement'), 'error');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const remove = async (p) => {
    if (!(await confirm(`Delete “${p.name}”?`, 'Only placements no campaign has used can be deleted. Otherwise deactivate it.'))) return;
    try {
      const res = await API.delete(`/ads/admin/placements/${p._id}`);
      showToast(res.data?.message || 'Placement deleted', 'success');
      reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete the placement'), 'error');
    }
  };

  if (loading && !data) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  const list = data || [];
  const f = editing?.form;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: TITLE }} />
      <T variant="small">Ad slots and their rate cards (whole NPR; 0 = not sold that way). A new key shows nothing until the website or app renders that slot.</T>
      <Button title="New placement" icon={Plus} size="sm" onPress={() => setEditing({ id: null, form: blank() })} style={{ alignSelf: 'flex-start' }} />

      {error && !data ? <ErrorState message={error} onRetry={() => reload()} /> : list.length ? list.map((p) => (
        <Card key={p._id} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }} gap={8}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="semibold">{p.name}</T>
              <T variant="caption">{p.key}{RENDERED.includes(p.key) ? '' : ' · not rendered by the apps yet'}</T>
            </View>
            <StatusChip status={p.isActive ? 'ACTIVE' : 'DRAFT'} label={p.isActive ? 'Active' : 'Inactive'} />
          </Row>
          {p.description ? <T variant="small">{p.description}</T> : null}
          <T variant="caption" style={{ color: colors.pine }}>{rateCardText(p.rateCard)}</T>
          <T variant="caption">
            {[(p.formats || []).map((x) => FORMAT_LABELS[x]).join(', '), (p.surfaces || []).map((x) => SURFACE_LABELS[x]).join(' + '), p.width && p.height ? `${p.width}×${p.height}px` : null, `max ${p.maxAds}`, `${p.activeCampaigns || 0} active campaign${p.activeCampaigns === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </T>
          <Row gap={8} style={{ justifyContent: 'flex-end' }}>
            <SmallIconButton icon={Pencil} label={`Edit ${p.name}`} onPress={() => setEditing({ id: p._id, form: toForm(p) })} />
            <SmallIconButton icon={Trash2} label={`Delete ${p.name}`} tone="danger" onPress={() => remove(p)} />
          </Row>
        </Card>
      )) : <EmptyState icon={LayoutTemplate} title="No placements" message="Create the first ad slot." />}

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit placement' : 'New placement'}
        footer={<Button title="Save placement" onPress={save} loading={saving} full />}
      >
        {f ? (
          <>
            <Field label="Key" value={f.key} onChangeText={set('key')} autoCapitalize="none" autoCorrect={false} placeholder="page.slot" hint="Cannot be renamed once a campaign uses it." />
            <Field label="Name" value={f.name} onChangeText={set('name')} maxLength={120} />
            <Field label="Description" value={f.description} onChangeText={set('description')} multiline maxLength={500} />
            <MultiPick label="Surfaces" options={SURFACES} labels={SURFACE_LABELS} value={f.surfaces} onChange={set('surfaces')} />
            <MultiPick label="Formats" options={AD_FORMATS} labels={FORMAT_LABELS} value={f.formats} onChange={set('formats')} />
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <Field style={{ flex: 1 }} label="Width px" value={f.width} onChangeText={(v) => set('width')(digits(v))} keyboardType="number-pad" />
              <Field style={{ flex: 1 }} label="Height px" value={f.height} onChangeText={(v) => set('height')(digits(v))} keyboardType="number-pad" />
            </Row>
            <Row gap={10} style={{ alignItems: 'flex-start' }}>
              <Field style={{ flex: 1 }} label="Max ads (1–5)" value={f.maxAds} onChangeText={(v) => set('maxAds')(digits(v).slice(0, 1))} keyboardType="number-pad" />
              <Field style={{ flex: 1 }} label="Order" value={f.order} onChangeText={(v) => set('order')(digits(v))} keyboardType="number-pad" />
            </Row>
            <T variant="semibold" style={{ fontSize: 14.5 }}>Rate card (NPR)</T>
            <MoneyField label="Flat price per day" value={f.flatPerDay} onChangeText={set('flatPerDay')} />
            <MoneyField label="CPM (per 1,000 impressions)" value={f.cpm} onChangeText={set('cpm')} />
            <MoneyField label="CPC (per click)" value={f.cpc} onChangeText={set('cpc')} />
            <ToggleRow title="Active" hint="Inactive placements are not offered to advertisers and serve nothing." value={f.isActive} onValueChange={set('isActive')} />
            <View style={{ height: space.sm }} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
