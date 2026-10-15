import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LayoutTemplate, Megaphone, Plus } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { findSection } from '../../lib/adminAccess';
import { formatNPR, formatNumber, humanize } from '../../lib/format';
import { colors, space } from '../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { SearchBar } from '../../components/admin/content/kit';
import { Box, Section, StatTile, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { CAMPAIGN_STATUSES, CampaignCard, DeliveryChip, pctText } from '../../components/ads/AdBits';

const TITLE = findSection('ads')?.label || 'Ad campaigns';
const FILTERS = [{ value: 'ACTIVE', label: 'Not archived' }, ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: humanize(s) }))];

// Web: SuperAdminDashboard "ads" tab. Summary (GET /ads/admin/summary), review queue
// (GET /ads/admin/campaigns?status=IN_REVIEW) and all campaigns by status.
// ?campaign=<id> (notification links /admin?tab=ads&campaign=<id>) opens that campaign.
export default function AdminAds() {
  const params = useLocalSearchParams();
  const { can } = useAuth();
  const [filter, setFilter] = useState('ACTIVE');
  const [q, setQ] = useState('');

  const summary = useSponsorApi('/ads/admin/summary', { fallback: 'Could not load the advertising summary.' });
  const queue = useSponsorApi('/ads/admin/campaigns?status=IN_REVIEW', { fallback: 'Could not load the review queue.' });
  const statusQuery = filter === 'ACTIVE' ? CAMPAIGN_STATUSES.filter((s) => s !== 'ARCHIVED').join(',') : filter;
  const all = useSponsorApi(`/ads/admin/campaigns?status=${statusQuery}`, { fallback: 'Could not load campaigns.' });

  const opened = useRef('');
  useEffect(() => {
    const id = typeof params.campaign === 'string' ? params.campaign : '';
    if (id && opened.current !== id) {
      opened.current = id;
      router.setParams({ campaign: undefined });
      router.push(`/admin/ad-campaign/${id}`);
    }
  }, [params.campaign]);

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    summary.reload();
    queue.reload();
    all.reload();
  }, [summary.reload, queue.reload, all.reload])); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (all.data || []).filter((c) => !s || [c.title, c.advertiser?.name].some((x) => String(x || '').toLowerCase().includes(s)));
  }, [all.data, q]);

  const sum = summary.data;
  const refreshing = summary.refreshing || queue.refreshing || all.refreshing;
  const refresh = () => { summary.refresh(); queue.refresh(); all.refresh(); };

  if (summary.loading && !sum && queue.loading) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: TITLE }} />
      <T variant="small">Sponsored cards, banners and videos from verified sponsor accounts. Every campaign is reviewed before it runs.</T>
      <Row wrap gap={10}>
        {can('canManageAds') ? <Button title="New campaign" icon={Plus} size="sm" onPress={() => router.push('/sponsor/ads/new')} /> : null}
        {can('canReviewAds') ? <Button title="Placements & rate cards" icon={LayoutTemplate} size="sm" variant="ghost" onPress={() => router.push('/admin/adPlacements')} /> : null}
      </Row>

      {summary.error && !sum ? <ErrorState message={summary.error} onRetry={() => summary.reload()} /> : sum ? (
        <Section title="Last 30 days">
          <Row wrap gap={10}>
            <StatTile label="Live now" value={formatNumber(sum.live)} tone="pine" />
            <StatTile label="Awaiting review" value={formatNumber(sum.awaitingReview)} tone={sum.awaitingReview ? 'warn' : undefined} />
            <StatTile label="Impressions" value={formatNumber(sum.last30?.impressions)} hint={`${pctText(sum.last30?.viewableRate)} viewable`} />
            <StatTile label="Clicks" value={formatNumber(sum.last30?.clicks)} hint={`CTR ${pctText(sum.last30?.ctr)}`} />
            <StatTile label="Booked" value={formatNPR(sum.money?.booked)} />
            <StatTile label="Earned to date" value={formatNPR(sum.money?.earned)} tone="pine" />
          </Row>
          <T variant="caption">{`Filtered traffic (staff, bots, repeats — not billed): ${formatNumber(sum.last30?.filtered)}.`}</T>
          {sum.money?.note ? <T variant="caption">{sum.money.note}</T> : null}
          {Object.keys(sum.byStatus || {}).length ? (
            <Row wrap gap={8}>
              {Object.entries(sum.byStatus).map(([s, n]) => <T key={s} variant="caption" style={{ color: colors.inkSoft }}>{`${humanize(s)}: ${n}`}</T>)}
            </Row>
          ) : null}
          {sum.top?.length ? (
            <Box>
              <T variant="semibold" style={{ fontSize: 14.5 }}>Top campaigns by impressions</T>
              {sum.top.map((t) => (
                <Card key={t._id} padded={false} style={{ padding: space.md, gap: 4, shadowOpacity: 0, elevation: 0 }} onPress={() => router.push(`/admin/ad-campaign/${t._id}`)} accessibilityLabel={t.title}>
                  <Row style={{ justifyContent: 'space-between' }} gap={8}>
                    <T variant="semibold" style={{ flex: 1, fontSize: 14.5 }} numberOfLines={1}>{t.title}</T>
                    <DeliveryChip status={t.deliveryStatus} />
                  </Row>
                  <T variant="caption">{`${t.advertiser || ''} · ${formatNumber(t.impressions)} impressions · ${formatNumber(t.clicks)} clicks · CTR ${pctText(t.ctr)}`}</T>
                </Card>
              ))}
            </Box>
          ) : null}
        </Section>
      ) : null}

      <Section title="Review queue" hint={queue.data?.length ? `${queue.data.length} waiting` : undefined}>
        {queue.error && !queue.data ? <ErrorState message={queue.error} onRetry={() => queue.reload()} /> : queue.data?.length ? (
          queue.data.map((c) => <CampaignCard key={c._id} c={c} href={`/admin/ad-campaign/${c._id}`} />)
        ) : queue.loading ? <Loading /> : <T variant="small">Nothing waiting for review.</T>}
      </Section>

      <Section title="All campaigns">
        <SearchBar value={q} onChange={setQ} placeholder="Search title or advertiser…" />
        <ChipBar options={FILTERS} value={filter} onChange={setFilter} style={{ paddingHorizontal: 0 }} />
        {all.loading && !all.data ? <Loading /> : all.error && !all.data ? <ErrorState message={all.error} onRetry={() => all.reload()} /> : list.length ? (
          <View style={{ gap: space.md }}>
            {list.map((c) => <CampaignCard key={c._id} c={c} href={`/admin/ad-campaign/${c._id}`} />)}
          </View>
        ) : (
          <EmptyState icon={Megaphone} title={(all.data || []).length ? 'No matches' : 'No campaigns here'} message={(all.data || []).length ? 'Try another search.' : 'Campaigns appear here as soon as an advertiser saves a draft.'} />
        )}
      </Section>
    </Screen>
  );
}
