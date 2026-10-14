import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack } from 'expo-router';
import { CheckCircle2, Megaphone, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { formatDate, formatNPR, formatNumber, pct } from '../../lib/format';
import { colors, fonts, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Field, Loading, ProgressBar, Row, Screen, Select, Sheet, StatusChip, T } from '../../components/ui';

const TITLE = findSection('campaigns')?.label || 'Campaigns';
const EMPTY = { title: '', description: '', goalAmount: '50000' };
const FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

// Web: "campaigns" tab. Launch → POST /donations/campaigns; edit / close / reopen → PUT /admin/campaigns/:id;
// delete → DELETE /admin/campaigns/:id. All management needs canManageDonations.
export default function AdminCampaigns() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const canManage = can('canManageDonations');

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const [editing, setEditing] = useState(null); // null | 'new' | campaign
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await API.get('/donations/campaigns');
      if (res.data?.success) setCampaigns(res.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load campaigns.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => campaigns.filter((c) => filter === 'All' || c.status === filter), [campaigns, filter]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => { setForm(EMPTY); setStatus('ACTIVE'); setEditing('new'); };
  const openEdit = (c) => {
    setForm({ title: c.title || '', description: c.description || '', goalAmount: String(c.goalAmount ?? '') });
    setStatus(c.status || 'ACTIVE');
    setEditing(c);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim() || !(Number(form.goalAmount) > 0)) {
      showToast('Title, description and a goal amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing === 'new') {
        const res = await API.post('/donations/campaigns', form);
        if (res.data?.success) showToast('Donation campaign launched live!', 'success');
      } else {
        const res = await API.put(`/admin/campaigns/${editing._id}`, { ...form, status });
        if (res.data?.success) showToast('Campaign updated', 'success');
      }
      setEditing(null);
      load();
    } catch (err) {
      showToast(errorMessage(err, editing === 'new' ? 'Campaign launch failed' : 'Campaign update failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setCampaignStatus = async (c, next) => {
    const closing = next === 'COMPLETED';
    if (!(await confirm(closing ? 'Close this campaign?' : 'Reopen this campaign?', closing ? `"${c.title}" will be marked completed.` : `"${c.title}" will be active again.`, { confirmText: closing ? 'Close' : 'Reopen', destructive: closing }))) return;
    try {
      const res = await API.put(`/admin/campaigns/${c._id}`, { status: next });
      if (res.data?.success) {
        showToast(closing ? 'Campaign closed' : 'Campaign reopened', 'success');
        setCampaigns((prev) => prev.map((x) => (x._id === c._id ? { ...x, status: next } : x)));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Campaign update failed'), 'error');
    }
  };

  const handleDelete = async (c) => {
    if (!(await confirm('Delete this donation campaign?', `"${c.title}" will be removed.`, { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/admin/campaigns/${c._id}`);
      if (res.data?.success) {
        showToast('Campaign deleted', 'success');
        setCampaigns((prev) => prev.filter((x) => x._id !== c._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete campaign failed'), 'error');
    }
  };

  const renderItem = ({ item: c }) => {
    const p = pct(c.raisedAmount || 0, c.goalAmount);
    return (
      <Card style={{ marginHorizontal: space.lg, gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <StatusChip status={c.status} />
          <T variant="caption">{formatDate(c.createdAt)}</T>
        </Row>
        <View style={{ gap: 4 }}>
          <T variant="h3">{c.title}</T>
          {c.description ? <T variant="small" numberOfLines={3}>{c.description}</T> : null}
          {c.creator?.name ? <T variant="caption">By {c.creator.name}{c.post?.title ? ` · for “${c.post.title}”` : ''}</T> : null}
        </View>
        <View style={{ gap: 6 }}>
          <ProgressBar value={p} />
          <T variant="small" style={{ color: colors.inkSoft }}>
            <T style={{ fontFamily: fonts.bold, color: colors.pine }}>{formatNPR(c.raisedAmount)}</T> raised of {formatNPR(c.goalAmount)} · {Math.round(p)}%
            {c.donorsCount ? ` · ${formatNumber(c.donorsCount)} donors` : ''}
          </T>
        </View>
        {canManage ? (
          <Row gap={8} wrap>
            <Button title="Edit" icon={Pencil} variant="ghost" size="sm" onPress={() => openEdit(c)} />
            {c.status === 'ACTIVE' ? (
              <Button title="Close" icon={CheckCircle2} variant="soft" size="sm" onPress={() => setCampaignStatus(c, 'COMPLETED')} />
            ) : (
              <Button title="Reopen" icon={RotateCcw} variant="soft" size="sm" onPress={() => setCampaignStatus(c, 'ACTIVE')} />
            )}
            <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => handleDelete(c)} />
          </Row>
        ) : null}
      </Card>
    );
  };

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={list}
        keyExtractor={(c) => c._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <T variant="small">{campaigns.length} campaigns · targets, collected funds and status.</T>
              {canManage ? <Button title="Launch campaign" icon={Plus} size="sm" onPress={openNew} /> : null}
            </View>
            <ChipBar options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : (
            <EmptyState
              icon={Megaphone}
              title={campaigns.length ? 'No campaigns here' : 'No fundraising campaigns yet'}
              message={campaigns.length ? 'Try another filter.' : undefined}
              action={!campaigns.length && canManage ? 'Launch a campaign' : null}
              onAction={openNew}
            />
          )
        }
      />

      <Sheet
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Launch fundraising campaign' : 'Edit campaign'}
        footer={<Button title={editing === 'new' ? 'Launch campaign' : 'Save changes'} onPress={save} loading={saving} full />}
      >
        <Field label="Campaign title" value={form.title} onChangeText={set('title')} />
        <Field label="Description" value={form.description} onChangeText={set('description')} multiline />
        <Field label="Target goal amount (NPR)" value={form.goalAmount} onChangeText={(v) => set('goalAmount')(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
        {editing && editing !== 'new' ? (
          <Select label="Status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'COMPLETED', label: 'Completed' }]} value={status} onChange={setStatus} />
        ) : null}
      </Sheet>
    </Screen>
  );
}
