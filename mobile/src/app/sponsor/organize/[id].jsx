import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BriefcaseBusiness, ChevronRight, Handshake, LogIn, Save, ShieldAlert } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatDate, humanize, timeAgo } from '../../../lib/format';
import { colors, space } from '../../../theme';
import { Button, Card, Chip, EmptyState, ErrorState, Loading, Row, Screen, Segmented, Sheet, StatusChip, T } from '../../../components/ui';
import { Box, KV, Notice, STAGES, useSponsorApi } from '../../../components/sponsorship/AdminSponsorKit';
import { OpportunityFields, opportunityPayload, opportunityToForm, validateOpportunity } from '../../../components/sponsorship/AdminOpportunityForm';
import AdminDealDetail, { useDeal } from '../../../components/sponsorship/AdminDealDetail';
import AdminBrandKitEditor from '../../../components/sponsorship/AdminBrandKitEditor';

const stageTone = (s) => (['AGREED', 'FULFILLED'].includes(s) ? 'COMPLETED' : ['DECLINED', 'WITHDRAWN', 'CANCELLED'].includes(s) ? 'CANCELLED' : 'PENDING');
const oppTone = (s) => (s === 'OPEN' ? 'ACTIVE' : s === 'DRAFT' ? 'DRAFT' : s === 'CANCELLED' ? 'CANCELLED' : s === 'COMPLETED' ? 'COMPLETED' : 'INFO');

// Web: /organize/:id — the organiser workspace for one sponsorship campaign.
// Organisers (USERs listed on the opportunity) and sponsorship / brand staff can use it.
// Organisers edit details (never status or organisers), move deals through review,
// message sponsors, track deliverables, write impact reports and lay out the brand kit.
// The API never sends them money, so no money fields are rendered for them.

const DealSheetBody = ({ id, showToast, onChanged }) => {
  const { data: deal, setData, loading, error, reload } = useDeal(id);
  if (loading) return <Loading />;
  if (!deal) return <ErrorState message={error} onRetry={() => reload()} />;
  return <AdminDealDetail deal={deal} onDeal={(d) => { setData(d); onChanged?.(); }} showToast={showToast} />;
};

export default function OrganizerWorkspace() {
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState('deals');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openDeal, setOpenDeal] = useState(null);

  const opp = useSponsorApi(user && id ? `/sponsorship/opportunities/${id}` : null, { fallback: 'Could not load this campaign.' });
  const o = opp.data;
  const viewer = o?.viewer || {};
  const allowed = viewer.canManage || viewer.isOrganizer || viewer.canBrand;
  const canEditDetails = viewer.canManage || viewer.isOrganizer;
  const deals = useSponsorApi(allowed ? `/sponsorship/admin/deals?opportunity=${id}` : null, { fallback: 'Could not load deals.' });

  useEffect(() => { if (o) setForm(opportunityToForm(o)); }, [o]);

  const grouped = useMemo(() => {
    const list = deals.data || [];
    return STAGES.map((s) => ({ stage: s, items: list.filter((d) => d.stage === s) })).filter((g) => g.items.length);
  }, [deals.data]);

  const saveDetails = async () => {
    const problem = validateOpportunity(form);
    if (problem) return showToast(problem, 'error');
    setSaving(true);
    try {
      const res = await API.put(`/sponsorship/opportunities/${id}`, opportunityPayload(form, 'organizer'));
      showToast(res.data?.message || 'Details saved', 'success');
      opp.reload();
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the details'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const header = <Stack.Screen options={{ title: o?.title || 'Organiser workspace' }} />;

  if (authLoading) return <Loading />;
  if (!user) {
    return (
      <Screen>
        {header}
        <EmptyState icon={LogIn} title="Sign in to organise" message="The organiser workspace is for campaign organisers and the Hateymalo team." action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }
  if (opp.loading) return <>{header}<Loading /></>;
  if (!o) {
    return (
      <Screen>
        {header}
        {opp.status === 404 ? (
          <EmptyState icon={Handshake} title="Campaign not found" message="It may have been removed, or it is a draft you are not organising." action="See sponsorship campaigns" onAction={() => router.replace('/sponsor')} />
        ) : opp.status === 403 ? (
          <EmptyState icon={ShieldAlert} title="No access" message={opp.error} />
        ) : (
          <ErrorState message={opp.error} onRetry={() => opp.reload()} />
        )}
      </Screen>
    );
  }
  if (!allowed) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon={ShieldAlert}
          title="Organisers only"
          message={`This workspace is for the organisers of “${o.title}”. Ask a sponsorship manager to add you as an organiser.`}
          action="View the campaign"
          onAction={() => router.replace(`/sponsor/${o._id}`)}
        />
      </Screen>
    );
  }

  const tabs = [
    { value: 'deals', label: 'Sponsors' },
    { value: 'details', label: 'Details' },
    { value: 'brand', label: 'Brand kit' },
  ];

  return (
    <Screen scroll={false}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={opp.refreshing || deals.refreshing} onRefresh={() => { opp.refresh(); deals.refresh(); }} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        <View style={{ gap: 6 }}>
          <Row wrap gap={8}>
            <StatusChip status={oppTone(o.status)} label={humanize(o.status)} />
            <T variant="caption">{humanize(o.campaignType)}</T>
            {viewer.isOrganizer ? <Chip label="You organise this" tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
          </Row>
          <T variant="h2">{o.title}</T>
          <T variant="small">{[o.startDate ? `${formatDate(o.startDate)}${o.endDate ? ` – ${formatDate(o.endDate)}` : ''}` : null, o.location].filter(Boolean).join(' · ')}</T>
          {o.organizers?.length ? <T variant="caption" style={{ color: colors.muted }}>{`Organisers: ${o.organizers.map((u) => u.name).join(', ')}`}</T> : null}
        </View>
        <Segmented options={tabs} value={tab} onChange={setTab} />

        {tab === 'deals' ? (
          <View style={{ gap: space.md }}>
            <T variant="small">Move proposals through review, talk to sponsors and record proof for each deliverable. Only sponsorship managers agree, complete or cancel deals.</T>
            {deals.loading ? <Loading /> : deals.error ? <ErrorState message={deals.error} onRetry={() => deals.reload()} /> : null}
            {!deals.loading && !deals.error && !grouped.length ? (
              <EmptyState icon={BriefcaseBusiness} title="No sponsors yet" message="Proposals appear here once sponsors apply to this campaign." />
            ) : null}
            {grouped.map((g) => (
              <View key={g.stage} style={{ gap: space.sm }}>
                <Row gap={8}>
                  <T variant="eyebrow">{humanize(g.stage)}</T>
                  <T variant="caption" style={{ color: colors.muted }}>{g.items.length}</T>
                </Row>
                {g.items.map((d) => (
                  <Card key={d._id} onPress={() => setOpenDeal(d)} style={{ gap: 4 }} accessibilityLabel={`Open ${d.sponsor?.name} deal`}>
                    <Row gap={8}>
                      <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{d.sponsor?.name || 'Sponsor'}</T>
                      <StatusChip status={stageTone(d.stage)} label={humanize(d.stage)} />
                      <ChevronRight size={18} color={colors.muted} />
                    </Row>
                    <T variant="caption" style={{ color: colors.muted }}>
                      {[
                        d.tier?.name || (d.isCustomQuote ? 'Custom proposal' : null),
                        d.deliverables?.length ? `${d.deliverables.filter((x) => ['DONE', 'WAIVED'].includes(x.status)).length}/${d.deliverables.length} deliverables` : null,
                        d.logoUrl ? (d.logoUsageApproved ? 'logo approved' : 'logo not approved') : null,
                        `updated ${timeAgo(d.updatedAt)}`,
                      ].filter(Boolean).join(' · ')}
                    </T>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'details' ? (
          canEditDetails && form ? (
            <View style={{ gap: space.lg }}>
              <Notice tone="paper">Status and organisers are managed by sponsorship managers.</Notice>
              <OpportunityFields form={form} setForm={setForm} mode="organizer" />
              <Button title="Save details" icon={Save} onPress={saveDetails} loading={saving} />
            </View>
          ) : (
            <Box>
              {o.summary ? <T variant="body">{o.summary}</T> : null}
              {o.description ? <T variant="small">{o.description}</T> : null}
              <KV label="Location" value={o.location} />
              <KV label="Schedule" value={o.schedule} />
              <KV label="Expected audience" value={o.expectedAudience?.count ? `${o.expectedAudience.count} ${o.expectedAudience.description || ''}`.trim() : ''} />
              {o.objectives?.length ? <T variant="small">• {o.objectives.join('\n• ')}</T> : null}
            </Box>
          )
        ) : null}

        {tab === 'brand' ? (
          <AdminBrandKitEditor opportunityId={o._id} canEdit={!!(viewer.canBrand || viewer.isOrganizer)} showToast={showToast} />
        ) : null}
      </ScrollView>

      <Sheet visible={!!openDeal} onClose={() => setOpenDeal(null)} title={openDeal?.sponsor?.name || 'Sponsor deal'}>
        {openDeal ? <DealSheetBody id={openDeal._id} showToast={showToast} onChanged={() => deals.reload()} /> : null}
      </Sheet>
    </Screen>
  );
}
