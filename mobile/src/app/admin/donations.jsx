import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Stack } from 'expo-router';
import { Download, HandCoins } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, formatNPR, humanize } from '../../lib/format';
import { colors, fonts, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { SearchBox, StatusPill, exportCSV, matches } from '../../components/admin/people/PeopleKit';

const TITLE = findSection('donations')?.label || 'Donations';

// Web: "donations" tab — GET /admin/donations (needs canViewDonations; the layout guards it).
export default function AdminDonations() {
  const { showToast } = useToast();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      const res = await API.get('/admin/donations');
      if (res.data?.success) setDonations(res.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load donations.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const types = useMemo(() => [...new Set(donations.map((d) => d.type).filter(Boolean))], [donations]);
  const list = useMemo(
    () =>
      donations
        .filter((d) => type === 'All' || d.type === type)
        .filter((d) => matches(query, d.transactionId, d.donor?.name, d.donor?.email, d.campaign?.title, d.paymentMethod)),
    [donations, type, query]
  );
  const total = useMemo(() => list.reduce((s, d) => s + (Number(d.amount) || 0), 0), [list]);

  const renderItem = ({ item: d }) => (
    <Card style={{ marginHorizontal: space.lg, gap: 6 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="semibold" numberOfLines={1}>{d.donor?.name || 'Anonymous Donor'}</T>
          {d.campaign?.title ? <T variant="small" numberOfLines={2}>{d.campaign.title}</T> : null}
        </View>
        <T style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.pine }}>{formatNPR(d.amount)}</T>
      </Row>
      <Row gap={6} wrap>
        {d.paymentMethod ? <StatusPill label={d.paymentMethod} bg={colors.skyTint} fg={colors.sky} /> : null}
        {d.type ? <StatusPill label={humanize(d.type)} /> : null}
        <T variant="caption">{formatDate(d.createdAt)}</T>
      </Row>
      <T variant="caption" selectable style={{ fontFamily: undefined }}>Txn: {d.transactionId || '—'}</T>
      {d.donorMessage ? <T variant="small" numberOfLines={3}>“{d.donorMessage}”</T> : null}
    </Card>
  );

  if (loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <FlatList
        data={list}
        keyExtractor={(d) => d._id}
        renderItem={renderItem}
        contentContainerStyle={{ gap: space.md, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
              <Card style={{ gap: 2 }}>
                <T variant="small">{list.length} of {donations.length} donations</T>
                <T variant="h1" style={{ color: colors.pine }}>{formatNPR(total)}</T>
                <T variant="caption">Total of the donations shown</T>
              </Card>
              <SearchBox value={query} onChangeText={setQuery} placeholder="Search donor, transaction ID or campaign…" />
            </View>
            {types.length > 1 ? (
              <ChipBar options={[{ value: 'All', label: 'All types' }, ...types.map((t) => ({ value: t, label: humanize(t) }))]} value={type} onChange={setType} />
            ) : null}
            <View style={{ paddingHorizontal: space.lg }}>
              <Button title="Export ledger CSV" icon={Download} variant="ghost" size="sm" onPress={() => exportCSV(donations, 'hateymalo_donations', showToast)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => load()} />
          ) : (
            <EmptyState icon={HandCoins} title={donations.length ? 'No donations match' : 'No donations recorded yet'} message={donations.length ? 'Try another search or type.' : 'Confirmed contributions will appear here.'} />
          )
        }
      />
    </Screen>
  );
}
