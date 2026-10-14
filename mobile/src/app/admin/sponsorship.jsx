import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { BriefcaseBusiness, Handshake, Layers, Palette, Pencil, Plus, Trash2, Users } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { formatDate, formatNPR, formatNumber, humanize } from '../../lib/format';
import { colors, radius, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, Segmented, Sheet, StatusChip, T } from '../../components/ui';
import { OPP_STATUSES, STAGES, StatTile, has, isHttpUrl, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { OpportunityFields, blankOpportunity, opportunityPayload, opportunityToForm, validateOpportunity } from '../../components/sponsorship/AdminOpportunityForm';
import AdminTierEditor from '../../components/sponsorship/AdminTierEditor';
import AdminBrandKitEditor from '../../components/sponsorship/AdminBrandKitEditor';

const TITLE = findSection('sponsorship')?.label || 'Opportunities & tiers';
const FILTERS = [{ value: '', label: 'All' }, ...OPP_STATUSES.map((s) => ({ value: s, label: humanize(s) }))];
const oppTone = (s) => (s === 'OPEN' ? 'ACTIVE' : s === 'DRAFT' ? 'DRAFT' : s === 'CANCELLED' ? 'CANCELLED' : s === 'COMPLETED' ? 'COMPLETED' : 'INFO');

// Web: SuperAdminDashboard "sponsorship" tab (canManageSponsorships).
// Summary → GET /sponsorship/admin/summary; opportunities → GET /sponsorship/admin/opportunities;
// create/edit/delete → POST/PUT/DELETE /sponsorship/opportunities; tiers and templates →
// /sponsorship/tiers; brand kit → /sponsorship/opportunities/:id/brand-kit.
export default function AdminSponsorship() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const canBrand = can('canManageSponsorships') || can('canManageBrandKits');

  const [tab, setTab] = useState('opps');
  const [status, setStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const summary = useSponsorApi('/sponsorship/admin/summary');
  const { data, loading, refreshing, error, reload, refresh } = useSponsorApi(`/sponsorship/admin/opportunities${status ? `?status=${status}` : ''}`, { fallback: 'Could not load opportunities.' });
  const templates = useSponsorApi('/sponsorship/tiers?opportunity=templates');
  const opps = data || [];

  const [editing, setEditing] = useState(null); // null | 'new' | opportunity
  const [form, setForm] = useState(blankOpportunity());
  const [saving, setSaving] = useState(false);
  const [tiersFor, setTiersFor] = useState(null);
  const [kitFor, setKitFor] = useState(null);

  const pullAll = () => { refresh(); summary.reload(); templates.reload(); setRefreshKey((k) => k + 1); };

  const openNew = () => { setForm(blankOpportunity()); templates.reload(); setEditing('new'); };
  const openEdit = (o) => { setForm(opportunityToForm(o)); setEditing(o); };

  const save = async () => {
    const problem = validateOpportunity(form);
    if (problem) return showToast(problem, 'error');
    setSaving(true);
    try {
      const isNew = editing === 'new';
      const body = opportunityPayload(form, isNew ? 'create' : 'manager');
      const res = isNew ? await API.post('/sponsorship/opportunities', body) : await API.put(`/sponsorship/opportunities/${editing._id}`, body);
      showToast(res.data?.message || 'Saved', 'success');
      setEditing(null);
      reload();
      summary.reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the opportunity'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o) => {
    if (!(await confirm(`Delete "${o.title}"?`, 'Its tiers and any declined/withdrawn proposals are deleted too. Campaigns with active or completed deals cannot be deleted — close or cancel them instead.', { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/sponsorship/opportunities/${o._id}`);
      showToast(res.data?.message || 'Opportunity deleted', 'success');
      reload();
      summary.reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete the opportunity'), 'error');
    }
  };

  const s = summary.data;
  const pipeline = useMemo(() => (s?.pipeline || []).slice().sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage)), [s]);

  const Summary = s ? (
    <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
      <Row wrap gap={10}>
        <StatTile label="Contracted cash" value={formatNPR(s.contractedCash)} hint="Agreed & fulfilled deals" />
        {has(s.receivedCash) ? <StatTile label="Received" value={formatNPR(s.receivedCash)} tone="pine" /> : null}
        {has(s.outstandingCash) ? <StatTile label="Outstanding" value={formatNPR(s.outstandingCash)} tone={s.outstandingCash > 0 ? 'warn' : undefined} /> : null}
        <StatTile label="In-kind pledged" value={formatNPR(s.inKind?.pledgedValue)} hint="estimated — not cash" />
        <StatTile label="In-kind received" value={formatNPR(s.inKind?.receivedValue)} hint={`estimated — not cash · ${formatNumber(s.inKind?.items)} item${s.inKind?.items === 1 ? '' : 's'}`} />
        <StatTile label="Sponsor accounts to verify" value={formatNumber(s.pendingSponsorAccounts)} tone={s.pendingSponsorAccounts ? 'warn' : undefined} />
      </Row>
      {s.inKind?.note ? <T variant="caption" style={{ color: colors.muted }}>{s.inKind.note}</T> : null}
      <Row wrap gap={8}>
        {OPP_STATUSES.filter((k) => s.opportunities?.[k]).map((k) => (
          <StatusChip key={k} status={oppTone(k)} label={`${humanize(k)} ${s.opportunities[k]}`} />
        ))}
      </Row>
      {pipeline.length ? (
        <Card padded style={{ gap: 6 }}>
          <T variant="semibold">Deal pipeline</T>
          {pipeline.map((p) => (
            <Row key={p.stage} style={{ justifyContent: 'space-between' }}>
              <T variant="small">{`${humanize(p.stage)} · ${p.deals}`}</T>
              <T variant="small" style={{ color: colors.muted }}>{p.projected ? `${formatNPR(p.projected)} proposed` : ''}</T>
            </Row>
          ))}
        </Card>
      ) : null}
      <Row wrap gap={8}>
        <Button title="All deals" icon={BriefcaseBusiness} variant="ghost" size="sm" onPress={() => router.push('/admin/sponsorDeals')} />
        <Button title={s.pendingSponsorAccounts ? `Verify sponsors (${s.pendingSponsorAccounts})` : 'Sponsor accounts'} icon={Users} variant="ghost" size="sm" onPress={() => router.push('/admin/sponsors')} />
      </Row>
    </View>
  ) : summary.error ? (
    <T variant="small" style={{ paddingHorizontal: space.lg, color: colors.brand }}>{summary.error}</T>
  ) : null;

  const renderItem = ({ item: o }) => {
    const st = o.dealStats || {};
    return (
      <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
        {isHttpUrl(o.coverImage) ? (
          <Image source={{ uri: o.coverImage }} style={{ width: '100%', height: 120, borderRadius: radius.md, backgroundColor: colors.paperDeep }} contentFit="cover" accessibilityLabel={`${o.title} cover`} />
        ) : null}
        <Row style={{ justifyContent: 'space-between' }} gap={8}>
          <StatusChip status={oppTone(o.status)} label={humanize(o.status)} />
          <T variant="caption">{humanize(o.campaignType)}</T>
        </Row>
        <View style={{ gap: 4 }}>
          <T variant="h3">{o.title}</T>
          {o.summary ? <T variant="small" numberOfLines={2}>{o.summary}</T> : null}
          <T variant="caption" style={{ color: colors.muted }}>
            {[o.startDate ? `${formatDate(o.startDate)}${o.endDate ? ` – ${formatDate(o.endDate)}` : ''}` : 'No dates yet', o.location].filter(Boolean).join(' · ')}
          </T>
          {o.organizers?.length ? <T variant="caption">{`Organisers: ${o.organizers.map((u) => u.name).join(', ')}`}</T> : null}
        </View>
        <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.md, gap: 4 }}>
          <T variant="small">{`${st.total || 0} deal${st.total === 1 ? '' : 's'} · ${st.open || 0} open · ${st.contracted || 0} agreed`}</T>
          {has(st.contractedCash) || o.fundingGoal ? (
            <T variant="small">
              {[has(st.contractedCash) ? `Contracted ${formatNPR(st.contractedCash)}` : null, has(st.received) ? `received ${formatNPR(st.received)}` : null, o.fundingGoal ? `goal ${formatNPR(o.fundingGoal)}` : null].filter(Boolean).join(' · ')}
            </T>
          ) : null}
        </View>
        <Row wrap gap={8}>
          <Button title="Edit" icon={Pencil} variant="ghost" size="sm" onPress={() => openEdit(o)} />
          <Button title="Tiers" icon={Layers} variant="soft" size="sm" onPress={() => setTiersFor(o)} />
          {canBrand ? <Button title="Brand kit" icon={Palette} variant="soft" size="sm" onPress={() => setKitFor(o)} /> : null}
          <Button title="Deals" icon={BriefcaseBusiness} variant="soft" size="sm" onPress={() => router.push(`/admin/sponsorDeals?opportunity=${o._id}&stage=ALL`)} />
          <Button title="Workspace" icon={Handshake} variant="text" size="sm" onPress={() => router.push(`/sponsor/organize/${o._id}`)} />
          <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => remove(o)} />
        </Row>
      </Card>
    );
  };

  if (loading && !data) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={tab === 'opps' ? opps : []}
        keyExtractor={(o) => o._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullAll} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            {Summary}
            <View style={{ paddingHorizontal: space.lg }}>
              <Segmented options={[{ value: 'opps', label: 'Opportunities' }, { value: 'templates', label: 'Tier templates' }]} value={tab} onChange={setTab} />
            </View>
            {tab === 'opps' ? (
              <>
                <View style={{ paddingHorizontal: space.lg }}>
                  <Button title="New opportunity" icon={Plus} size="sm" onPress={openNew} />
                </View>
                <ChipBar options={FILTERS} value={status} onChange={setStatus} />
              </>
            ) : (
              <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
                <T variant="small">Reusable packages you can copy onto any campaign. Prices are always yours to set — new standard templates start at Rs. 0.</T>
                <AdminTierEditor key={`tpl-${refreshKey}`} scope="templates" showToast={showToast} />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          tab !== 'opps' ? null : error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState
              icon={Handshake}
              title={status ? `No ${humanize(status).toLowerCase()} opportunities` : 'No sponsorship opportunities yet'}
              message={status ? 'Try another filter.' : 'Create a campaign that sponsors can support with cash or in kind.'}
              action={status ? 'Show all' : 'New opportunity'}
              onAction={status ? () => setStatus('') : openNew}
            />
          )
        }
      />

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New opportunity' : 'Edit opportunity'}
        footer={<Button title={editing === 'new' ? 'Create opportunity' : 'Save changes'} onPress={save} loading={saving} full />}
      >
        <OpportunityFields form={form} setForm={setForm} mode={editing === 'new' ? 'create' : 'manager'} templates={templates.data || []} />
      </Sheet>

      <Sheet visible={!!tiersFor} onClose={() => { setTiersFor(null); reload(); }} title={tiersFor ? `Tiers · ${tiersFor.title}` : ''}>
        {tiersFor ? <AdminTierEditor scope={tiersFor._id} showToast={showToast} /> : null}
      </Sheet>

      <Sheet visible={!!kitFor} onClose={() => setKitFor(null)} title={kitFor ? `Brand kit · ${kitFor.title}` : ''}>
        {kitFor ? <AdminBrandKitEditor opportunityId={kitFor._id} canEdit={canBrand} showToast={showToast} /> : null}
      </Sheet>
    </Screen>
  );
}
