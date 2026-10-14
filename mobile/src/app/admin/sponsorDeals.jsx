import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { BriefcaseBusiness, ChevronRight, X } from 'lucide-react-native';
import { findSection } from '../../lib/adminAccess';
import { formatNPR, humanize, timeAgo } from '../../lib/format';
import { colors, space } from '../../theme';
import { Card, Chip, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, StatusChip, T } from '../../components/ui';
import { SearchBar } from '../../components/admin/content/kit';
import { ACTIVE_STAGES, STAGES, has, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';

const TITLE = findSection('sponsorDeals')?.label || 'Sponsor deals';
const STAGE_FILTERS = [{ value: 'ACTIVE', label: 'Active' }, { value: 'ALL', label: 'All' }, ...STAGES.map((s) => ({ value: s, label: humanize(s) }))];
const stageTone = (s) => (['AGREED', 'FULFILLED'].includes(s) ? 'COMPLETED' : ['DECLINED', 'WITHDRAWN', 'CANCELLED'].includes(s) ? 'CANCELLED' : 'PENDING');

// Web: SuperAdminDashboard "sponsorDeals" tab. GET /sponsorship/admin/deals (managers, finance,
// brand staff). Deals are grouped by stage; ?deal=<id> (notification links) opens that deal,
// ?opportunity=<id> / ?sponsor=<id> pre-filter the list.
export default function AdminSponsorDeals() {
  const params = useLocalSearchParams();
  const [opportunity, setOpportunity] = useState(typeof params.opportunity === 'string' ? params.opportunity : '');
  const [sponsor, setSponsor] = useState(typeof params.sponsor === 'string' ? params.sponsor : '');
  const [stage, setStage] = useState(typeof params.stage === 'string' && STAGES.includes(params.stage) ? params.stage : 'ACTIVE');
  const [q, setQ] = useState('');

  const query = new URLSearchParams({ ...(opportunity ? { opportunity } : {}), ...(sponsor ? { sponsor } : {}) }).toString();
  const { data, loading, refreshing, error, reload, refresh } = useSponsorApi(`/sponsorship/admin/deals${query ? `?${query}` : ''}`, { fallback: 'Could not load deals.' });
  const opps = useSponsorApi('/sponsorship/admin/opportunities');

  // Deep link: open the requested deal once, then drop the param so Back returns here.
  const opened = useRef('');
  useEffect(() => {
    const id = typeof params.deal === 'string' ? params.deal : '';
    if (id && opened.current !== id) {
      opened.current = id;
      router.setParams({ deal: undefined });
      router.push(`/admin/sponsor-deal/${id}`);
    }
  }, [params.deal]);

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    reload();
  }, [reload]));

  const deals = data || [];
  const sections = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = deals.filter((d) => {
      if (stage === 'ACTIVE' && !ACTIVE_STAGES.includes(d.stage)) return false;
      if (!['ACTIVE', 'ALL'].includes(stage) && d.stage !== stage) return false;
      return !s || [d.sponsor?.name, d.opportunity?.title, d.tier?.name].some((x) => String(x || '').toLowerCase().includes(s));
    });
    return STAGES.map((st) => ({ title: st, data: filtered.filter((d) => d.stage === st) })).filter((x) => x.data.length);
  }, [deals, stage, q]);

  const sponsorName = sponsor ? deals.find((d) => d.sponsor?._id === sponsor)?.sponsor?.name || 'this sponsor' : '';
  const oppOptions = [{ value: '', label: 'All campaigns' }, ...(opps.data || []).map((o) => ({ value: o._id, label: o.title }))];

  const renderItem = ({ item: d }) => (
    <Card
      style={{ marginHorizontal: space.lg, gap: 6 }}
      onPress={() => router.push(`/admin/sponsor-deal/${d._id}`)}
      accessibilityLabel={`${d.sponsor?.name} for ${d.opportunity?.title}, ${humanize(d.stage)}`}
    >
      <Row style={{ justifyContent: 'space-between' }} gap={8}>
        <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{d.sponsor?.name || 'Sponsor'}</T>
        <ChevronRight size={18} color={colors.muted} />
      </Row>
      <T variant="small" numberOfLines={1}>{d.opportunity?.title}</T>
      <Row wrap gap={6}>
        <StatusChip status={stageTone(d.stage)} label={humanize(d.stage)} />
        {d.sponsor?.verificationStatus && d.sponsor.verificationStatus !== 'VERIFIED' ? (
          <StatusChip status={d.sponsor.verificationStatus} label={`Sponsor ${humanize(d.sponsor.verificationStatus).toLowerCase()}`} />
        ) : null}
        {d.tier?.name ? <Chip label={d.tier.name} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : d.isCustomQuote ? <Chip label="Custom" tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
      </Row>
      <T variant="caption" style={{ color: colors.muted }}>
        {[
          has(d.cashAmount) && d.cashAmount > 0 ? `Contracted ${formatNPR(d.cashAmount)}` : has(d.proposal?.amount) && d.proposal.amount > 0 ? `Proposed ${formatNPR(d.proposal.amount)}` : null,
          has(d.amountReceived) && d.amountReceived > 0 ? `received ${formatNPR(d.amountReceived)}` : null,
          has(d.inKindEstimatedValue) && d.inKindEstimatedValue > 0 ? `in-kind ${formatNPR(d.inKindEstimatedValue)} (estimated — not cash)` : null,
          d.deliverables?.length ? `${d.deliverables.filter((x) => ['DONE', 'WAIVED'].includes(x.status)).length}/${d.deliverables.length} deliverables` : null,
          `updated ${timeAgo(d.updatedAt)}`,
        ].filter(Boolean).join(' · ')}
      </T>
    </Card>
  );

  if (loading && !data) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      <SectionList
        sections={sections}
        keyExtractor={(d) => d._id}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Row style={{ paddingHorizontal: space.lg, paddingTop: space.md }} gap={8}>
            <T variant="eyebrow">{humanize(section.title)}</T>
            <T variant="caption" style={{ color: colors.muted }}>{section.data.length}</T>
          </Row>
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        SectionSeparatorComponent={() => <View style={{ height: space.sm }} />}
        contentContainerStyle={{ paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { refresh(); opps.reload(); }} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, paddingTop: space.lg }}>
            <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
              <T variant="small">{`${deals.length} deal${deals.length === 1 ? '' : 's'} · proposals, negotiations, agreements and fulfilment.`}</T>
              <SearchBar value={q} onChange={setQ} placeholder="Search sponsor, campaign or tier…" />
              {sponsor ? (
                <Row>
                  <Chip label={`Sponsor: ${sponsorName}`} icon={X} active onPress={() => setSponsor('')} />
                </Row>
              ) : null}
            </View>
            {oppOptions.length > 1 ? <ChipBar options={oppOptions} value={opportunity} onChange={setOpportunity} /> : null}
            <ChipBar options={STAGE_FILTERS} value={stage} onChange={setStage} />
          </View>
        }
        ListEmptyComponent={
          error ? (
            <ErrorState message={error} onRetry={() => reload()} />
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title={deals.length ? 'No deals here' : 'No sponsorship deals yet'}
              message={deals.length ? 'Try another stage or campaign.' : 'Proposals from sponsors appear here as soon as they apply.'}
              action={deals.length && stage !== 'ALL' ? 'Show all stages' : null}
              onAction={() => setStage('ALL')}
            />
          )
        }
      />
    </Screen>
  );
}
