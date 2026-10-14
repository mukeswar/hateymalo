import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Building2, ChevronRight, Handshake, LogIn, Plus, Search } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { formatNPR, humanize, timeAgo } from '../../../lib/format';
import { colors, fonts, radius } from '../../../theme';
import { Button, Card, EmptyState, ErrorState, Loading, Row, Screen, Skeleton, T } from '../../../components/ui';
import {
  CONTRACTED_STAGES,
  STAGES,
  STAGE_ORDER,
  SponsorLogo,
  StageChip,
  VerificationChip,
  accountTypeLabel,
  dateRange,
} from '../../../components/sponsorship/SponsorBits';
import SponsorAccountSheet from '../../../components/sponsorship/SponsorAccountSheet';

// /sponsor/portal — my sponsor accounts and deals (web: /sponsor/portal).
const GROUPS = [
  { key: 'action', title: 'In progress', stages: ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'] },
  { key: 'active', title: 'Agreed', stages: ['AGREED'] },
  { key: 'done', title: 'Completed', stages: ['FULFILLED'] },
  { key: 'closed', title: 'Closed', stages: ['DECLINED', 'WITHDRAWN', 'CANCELLED'] },
];

const nextStep = (d) => {
  if (d.stage === 'AGREED' && d.logoUrl && !d.logoUsageApproved && d.viewer?.sponsorRole !== 'VIEWER') return 'Approve your logo so it can appear on campaign materials.';
  if (d.stage === 'AGREED' && !d.logoUrl) return 'Choose the logo you want used on this campaign.';
  return STAGES[d.stage]?.next || '';
};

const DealCard = ({ d }) => {
  const contracted = CONTRACTED_STAGES.includes(d.stage);
  const amount = contracted ? d.cashAmount : d.proposal?.amount;
  return (
    <Card onPress={() => router.push(`/sponsor/portal/deal/${d._id}`)} style={{ gap: 10 }} accessibilityLabel={`${d.opportunity?.title}, ${STAGES[d.stage]?.label || d.stage}`}>
      <Row style={{ justifyContent: 'space-between' }} gap={8}>
        <StageChip stage={d.stage} />
        <T variant="caption">Updated {timeAgo(d.updatedAt)}</T>
      </Row>
      <T variant="h3">{d.opportunity?.title || 'Campaign'}</T>
      <T variant="small">
        {d.sponsor?.name}
        {d.tier?.name ? ` · ${d.tier.name}` : d.isCustomQuote ? ' · Custom package' : ''}
        {d.opportunity?.startDate ? ` · ${dateRange(d.opportunity.startDate, d.opportunity.endDate)}` : ''}
      </T>
      {amount > 0 ? (
        <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.pine }}>
          {formatNPR(amount)} {contracted ? 'contracted' : 'proposed'}
          {contracted && d.amountReceived !== undefined ? ` · ${formatNPR(d.amountReceived)} received` : ''}
        </T>
      ) : null}
      {nextStep(d) ? (
        <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.sm, padding: 10 }}>
          <T variant="small" style={{ color: colors.inkSoft }}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>Next: </T>
            {nextStep(d)}
          </T>
        </View>
      ) : null}
    </Card>
  );
};

export default function SponsorPortal() {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [a, d] = await Promise.all([API.get('/sponsorship/accounts/mine'), API.get('/sponsorship/deals/mine')]);
      setAccounts(a.data?.data || []);
      setDeals(d.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load your sponsor portal.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (authLoading) return <Screen><Loading /></Screen>;

  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Sponsor portal' }} />
        <EmptyState
          icon={LogIn}
          title="Sign in to your sponsor portal"
          message="Manage your organisation's sponsor accounts, proposals, logos and receipts in one place."
          action="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  const sorted = [...deals].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Sponsor portal' }} />

      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">प्रायोजक पोर्टल</T>
        <T variant="h1">Your sponsorships</T>
        <T variant="small">Proposals, agreements, logo approvals, receipts and impact reports for every organisation you represent.</T>
      </View>

      {loading ? (
        <>
          <Skeleton height={110} radius={radius.card} />
          <Skeleton height={160} radius={radius.card} />
        </>
      ) : error && !accounts.length && !deals.length ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <>
          {/* Accounts */}
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="h2">Sponsor accounts</T>
              <Button title="New" icon={Plus} size="sm" variant="ghost" onPress={() => setCreateOpen(true)} />
            </Row>
            {accounts.length ? (
              accounts.map((a) => (
                <Card key={a._id} onPress={() => router.push(`/sponsor/portal/account/${a._id}`)} style={{ gap: 10 }} accessibilityLabel={a.name}>
                  <Row gap={12}>
                    <SponsorLogo uri={a.logos?.[0]?.url} name={a.name} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="semibold" numberOfLines={1}>{a.name}</T>
                      <T variant="caption">{accountTypeLabel(a.type)} · you are {humanize(a.myRole || 'member').toLowerCase()}</T>
                    </View>
                    <ChevronRight size={18} color={colors.muted} />
                  </Row>
                  <Row gap={6} wrap>
                    <VerificationChip status={a.verificationStatus} />
                    <T variant="caption">{a.members?.length || 1} {a.members?.length === 1 ? 'member' : 'members'} · {a.logos?.length || 0} {a.logos?.length === 1 ? 'logo' : 'logos'}</T>
                  </Row>
                  {a.verificationStatus === 'REJECTED' && a.verificationNote ? (
                    <T variant="small" style={{ color: colors.brand }}>{a.verificationNote}</T>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={24} color={colors.pine} />
                </View>
                <T variant="h3" style={{ textAlign: 'center' }}>No sponsor account yet</T>
                <T variant="small" style={{ textAlign: 'center' }}>Register your company, NGO or business once, then apply to any campaign.</T>
                <Button title="Create a sponsor account" icon={Plus} variant="pine" onPress={() => setCreateOpen(true)} />
              </Card>
            )}
          </View>

          {/* Deals */}
          <View style={{ gap: 10 }}>
            <T variant="h2">Deals</T>
            {sorted.length ? (
              GROUPS.map((g) => {
                const list = sorted.filter((d) => g.stages.includes(d.stage));
                if (!list.length) return null;
                return (
                  <View key={g.key} style={{ gap: 10 }}>
                    <T variant="eyebrow" style={{ color: colors.muted }}>{g.title} · {list.length}</T>
                    {list.map((d) => <DealCard key={d._id} d={d} />)}
                  </View>
                );
              })
            ) : (
              <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Handshake size={24} color={colors.brand} />
                </View>
                <T variant="h3" style={{ textAlign: 'center' }}>No proposals yet</T>
                <T variant="small" style={{ textAlign: 'center' }}>Browse campaigns that are open to sponsors and send your first proposal.</T>
                <Button title="Find a campaign" icon={Search} onPress={() => router.push('/sponsor')} />
              </Card>
            )}
          </View>
        </>
      )}

      <SponsorAccountSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
      />
    </Screen>
  );
}
