import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Plus, Receipt, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { confirm } from '../../lib/confirm';
import { findSection } from '../../lib/adminAccess';
import { formatDate, formatNPR } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Field, Loading, Row, Screen, Select, Sheet, T } from '../../components/ui';
import { SearchBox, exportCSV, matches } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('expenses')?.label || 'Expenses';
const EMPTY = { campaignId: '', title: '', amount: '', notes: '', spentDate: '', proof: '' };

// Web: "expenses" tab — GET /admin/expenses; log → POST /donations/campaigns/:id/expenses
// ({ campaignId, title, amount, notes, spentDate } + proofImages URLs); delete → DELETE /admin/expenses/:id.
export default function AdminExpenses() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const canManage = can('canManageDonations');

  const [expenses, setExpenses] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('All');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const [expRes, campRes] = await Promise.all([
        API.get('/admin/expenses'),
        API.get('/donations/campaigns').catch(() => null),
      ]);
      if (expRes.data?.success) setExpenses(expRes.data.data || []);
      if (campRes?.data?.success) setCampaigns(campRes.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load expenses.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(
    () =>
      expenses
        .filter((e) => campaignFilter === 'All' || e.campaign?._id === campaignFilter)
        .filter((e) => matches(query, e.title, e.notes, e.campaign?.title, e.createdBy?.name)),
    [expenses, campaignFilter, query]
  );
  const total = useMemo(() => list.reduce((s, e) => s + (Number(e.amount) || 0), 0), [list]);
  const campaignChips = useMemo(() => {
    const seen = new Map();
    expenses.forEach((e) => { if (e.campaign?._id) seen.set(e.campaign._id, e.campaign.title); });
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [expenses]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = async () => {
    if (!form.campaignId || !form.title.trim() || !form.amount) {
      showToast('Choose a campaign and enter a title and amount', 'error');
      return;
    }
    if (form.spentDate && Number.isNaN(new Date(form.spentDate).getTime())) {
      showToast('Use the date format YYYY-MM-DD', 'error');
      return;
    }
    const { proof, ...rest } = form;
    const proofImages = proof.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      const res = await API.post(`/donations/campaigns/${form.campaignId}/expenses`, { ...rest, proofImages });
      if (res.data?.success) {
        showToast('Expense record logged into transparency ledger!', 'success');
        setShowForm(false);
        setForm(EMPTY);
        load();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Expense log failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exp) => {
    if (!(await confirm('Delete expense record?', `"${exp.title}" (${formatNPR(exp.amount)}) will be removed from the ledger.`, { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/admin/expenses/${exp._id}`);
      if (res.data?.success) {
        showToast('Expense record deleted', 'success');
        setExpenses((prev) => prev.filter((e) => e._id !== exp._id));
      }
    } catch (err) {
      showToast(errorMessage(err, 'Delete expense failed'), 'error');
    }
  };

  const renderItem = ({ item: exp }) => (
    <Card style={{ marginHorizontal: space.lg, gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="semibold">{exp.title}</T>
          <T variant="small" numberOfLines={2}>{exp.campaign?.title || 'General Campaign'}</T>
        </View>
        <T style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.brand }}>{formatNPR(exp.amount)}</T>
      </Row>
      <T variant="caption">
        Spent {formatDate(exp.spentDate)}{exp.createdBy?.name ? ` · logged by ${exp.createdBy.name}` : ''}
      </T>
      {exp.notes ? <T variant="small">{exp.notes}</T> : null}
      {exp.proofImages?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {exp.proofImages.map((src) => (
            <Image key={src} source={{ uri: src }} style={{ width: 88, height: 88, borderRadius: radius.sm, backgroundColor: colors.paperDeep }} contentFit="cover" accessibilityLabel="Expense proof" />
          ))}
        </ScrollView>
      ) : null}
      {canManage ? (
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button title="Delete" icon={Trash2} variant="danger" size="sm" onPress={() => handleDelete(exp)} />
        </Row>
      ) : null}
    </Card>
  );

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={list}
        keyExtractor={(e) => e._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <Card style={{ gap: 2 }}>
                <T variant="small">{list.length} of {expenses.length} expense records</T>
                <T variant="h1" style={{ color: colors.brand }}>{formatNPR(total)}</T>
                <T variant="caption">Total spent in the records shown</T>
              </Card>
              <Row gap={8} wrap>
                {canManage ? <Button title="Log expense" icon={Plus} size="sm" onPress={() => { setForm(EMPTY); setShowForm(true); }} /> : null}
                <Button title="Export CSV" variant="ghost" size="sm" onPress={() => exportCSV(expenses, 'hateymalo_expenses', showToast)} />
              </Row>
              <SearchBox value={query} onChangeText={setQuery} placeholder="Search expense, notes or campaign…" />
            </View>
            {campaignChips.length > 1 ? (
              <ChipBar options={[{ value: 'All', label: 'All campaigns' }, ...campaignChips]} value={campaignFilter} onChange={setCampaignFilter} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : (
            <EmptyState icon={Receipt} title={expenses.length ? 'No expenses match' : 'No expenses logged yet'} message={expenses.length ? 'Try another search or campaign.' : 'Spending recorded against campaigns will appear here.'} />
          )
        }
      />

      <Sheet visible={showForm} onClose={() => setShowForm(false)} title="Log expense record" footer={<Button title="Log expense" onPress={handleAdd} loading={saving} full />}>
        {campaigns.length ? (
          <Select label="Campaign" options={campaigns.map((c) => ({ value: c._id, label: c.title }))} value={form.campaignId} onChange={set('campaignId')} />
        ) : (
          <T variant="small">No campaigns yet — launch a campaign first.</T>
        )}
        <Field label="Expense title / item" value={form.title} onChangeText={set('title')} placeholder="e.g. 500 Saplings Purchase" />
        <Field label="Amount spent (NPR)" value={form.amount} onChangeText={(v) => set('amount')(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
        <Field label="Date spent" value={form.spentDate} onChangeText={set('spentDate')} placeholder="YYYY-MM-DD (blank = today)" autoCapitalize="none" />
        <Field label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="What was bought, supplier, receipt number…" multiline />
        <Field
          label="Proof image URLs"
          value={form.proof}
          onChangeText={set('proof')}
          placeholder="https://… (one link per line)"
          hint="Links to receipts or photos shown on the campaign's transparency ledger."
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
      </Sheet>
    </Screen>
  );
}
