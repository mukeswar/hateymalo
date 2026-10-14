import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDays,
  Check,
  ClipboardList,
  ExternalLink,
  FilePenLine,
  Handshake,
  HeartHandshake,
  MapPin,
  Settings2,
  Target,
  Users,
} from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatNPR, formatNumber, humanize } from '../../lib/format';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { Avatar, Button, Card, Divider, EmptyState, ProgressBar, Row, Screen, Skeleton, T } from '../../components/ui';
import {
  Heading,
  SponsorLogo,
  TierLevelChip,
  campaignTypeLabel,
  dateRange,
  openLink,
  priceText,
  resourceLabel,
} from '../../components/sponsorship/SponsorBits';
import SponsorApplySheet from '../../components/sponsorship/SponsorApplySheet';

// /sponsor/[id] — sponsorship proposal page (web: /sponsor/opportunities/:id).
const Fact = ({ icon: Icon, label, children }) => (
  <Row gap={12} style={{ alignItems: 'flex-start' }}>
    <View style={styles.factIcon}>
      <Icon size={19} color={colors.brand} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <T variant="caption" style={styles.factLabel}>{label}</T>
      {children}
    </View>
  </Row>
);

const LOGO_SIZE_TEXT = { XL: 'Extra-large logo', L: 'Large logo', M: 'Medium logo', S: 'Small logo', NONE: 'No logo placement' };

export default function SponsorOpportunity() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTier, setApplyTier] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/sponsorship/opportunities/${id}`);
      setOpp(res.data?.data || null);
      setNotFound(false);
    } catch (err) {
      if (err?.response?.status === 404) setNotFound(true);
      else showToast(errorMessage(err, 'Could not load this campaign'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load, user?._id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startApply = (tierId = null) => {
    if (!user) {
      showToast('Please sign in to sponsor a campaign', 'info');
      router.push('/login');
      return;
    }
    setApplyTier(tierId);
    setApplyOpen(true);
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={220} radius={radius.card} />
        <Skeleton height={34} width="80%" />
        <Skeleton height={180} radius={radius.card} />
        <Skeleton height={240} radius={radius.card} />
      </Screen>
    );
  }

  if (!opp || notFound) {
    return (
      <Screen>
        <EmptyState
          icon={Handshake}
          title="We couldn't find this campaign"
          message="It may have been closed to sponsors, or the link may be incorrect."
          action="See open campaigns"
          onAction={() => router.replace('/sponsor')}
        />
      </Screen>
    );
  }

  const viewer = opp.viewer || {};
  const isOpen = opp.status === 'OPEN';
  const isDraft = opp.status === 'DRAFT';
  const tiers = opp.tiers || [];
  const sponsors = opp.sponsors || [];
  const audience = opp.expectedAudience || {};
  const pct = opp.fundingSecuredPct;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Sponsorship' }} />

      {viewer.canManage || viewer.isOrganizer ? (
        <View style={styles.staffBar}>
          <Row gap={8}>
            <Settings2 size={18} color={colors.white} />
            <T variant="semibold" style={{ color: colors.white, flex: 1 }}>
              {viewer.canManage ? 'You manage sponsorships' : 'You are an organiser of this campaign'}
            </T>
          </Row>
          <Row gap={8} wrap>
            <Button title="Organiser workspace" size="sm" variant="ghost" onPress={() => router.push(`/sponsor/organize/${opp._id}`)} />
            {viewer.canManage ? (
              <Button title="Sponsorship admin" size="sm" variant="soft" onPress={() => router.push('/admin/sponsorship')} />
            ) : null}
          </Row>
        </View>
      ) : null}

      {/* Hero */}
      <View style={styles.hero}>
        {opp.coverImage ? (
          <Image source={{ uri: opp.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[colors.pine, colors.pineDark]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />
        <Row gap={6} wrap style={{ position: 'absolute', top: 14, left: 14, right: 14 }}>
          <View style={[styles.overlayChip, shadow.soft]}>
            <T style={styles.overlayText}>{campaignTypeLabel(opp.campaignType)}</T>
          </View>
          {isDraft ? (
            <View style={[styles.overlayChip, { backgroundColor: colors.marigold }]}>
              <T style={[styles.overlayText, { color: colors.ink }]}>Draft — not public</T>
            </View>
          ) : !isOpen ? (
            <View style={[styles.overlayChip, { backgroundColor: colors.marigoldTint }]}>
              <T style={[styles.overlayText, { color: colors.marigoldText }]}>{humanize(opp.status)}</T>
            </View>
          ) : null}
        </Row>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4 }}>
          <T variant="eyebrowDeva" style={{ color: colors.marigold }}>प्रायोजन प्रस्ताव</T>
          <T style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.white }}>{opp.title}</T>
        </View>
      </View>

      {opp.summary ? <T variant="body" style={{ fontSize: 17, lineHeight: 26 }}>{opp.summary}</T> : null}

      {/* Funding + apply */}
      <Card style={{ gap: space.md }}>
        {pct !== null && pct !== undefined ? (
          <View style={{ gap: 8 }} accessibilityLabel={`${pct}% of the funding goal secured`}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <T variant="caption">Sponsor funding goal</T>
                <T style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.ink }}>{formatNPR(opp.fundingGoal)}</T>
              </View>
              <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.marigoldText }}>{pct}% secured</T>
            </Row>
            <ProgressBar value={pct} height={10} />
            <T variant="caption">Counts cash in signed agreements only. In-kind support is shown separately on each deal.</T>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <T variant="h3">Support in cash or in kind</T>
            <T variant="small">This campaign has no fixed cash goal. Packages and custom offers are welcome.</T>
          </View>
        )}
        {isOpen ? (
          <Button title="Apply to sponsor" icon={HeartHandshake} size="lg" full onPress={() => startApply(null)} />
        ) : (
          <T variant="small" style={{ textAlign: 'center' }}>
            {isDraft ? 'Sponsors can apply once this campaign is opened.' : 'This campaign is not taking new sponsors.'}
          </T>
        )}
        {user && isOpen ? (
          <Button title="My sponsor portal" variant="text" full onPress={() => router.push('/sponsor/portal')} />
        ) : null}
      </Card>

      {/* Facts */}
      <Card style={{ gap: space.lg }}>
        <Fact icon={CalendarDays} label="When">
          <T variant="medium">{opp.startDate ? dateRange(opp.startDate, opp.endDate) : 'Dates to be announced'}</T>
        </Fact>
        <Fact icon={MapPin} label="Where">
          <T variant="medium">{opp.location || 'To be announced'}</T>
        </Fact>
        {audience.count || audience.description ? (
          <Fact icon={Users} label="Expected audience">
            {audience.count ? <T variant="medium">{formatNumber(audience.count)} people</T> : null}
            {audience.description ? <T variant="small">{audience.description}</T> : null}
          </Fact>
        ) : null}
        {opp.event?._id ? (
          <Pressable onPress={() => router.push(`/event/${opp.event._id}`)} accessibilityRole="link">
            <Fact icon={ExternalLink} label="Linked event">
              <T variant="medium" style={{ color: colors.brand }}>{opp.event.title}</T>
            </Fact>
          </Pressable>
        ) : null}
        {opp.donationCampaign?._id ? (
          <Pressable onPress={() => router.push('/donate')} accessibilityRole="link">
            <Fact icon={ExternalLink} label="Linked donation campaign">
              <T variant="medium" style={{ color: colors.brand }}>{opp.donationCampaign.title}</T>
            </Fact>
          </Pressable>
        ) : null}
      </Card>

      {opp.description ? (
        <View style={{ gap: 8 }}>
          <T variant="h1">About the campaign</T>
          <T variant="body" style={{ fontSize: 16.5, lineHeight: 26 }}>{opp.description}</T>
        </View>
      ) : null}

      {opp.objectives?.length ? (
        <Card style={{ gap: 12 }}>
          <Row gap={8}>
            <Target size={20} color={colors.brand} />
            <T variant="h2">Objectives</T>
          </Row>
          {opp.objectives.map((o, i) => (
            <Row key={`${o}-${i}`} gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={styles.check}><Check size={13} color={colors.pine} /></View>
              <T variant="body" style={{ flex: 1 }}>{o}</T>
            </Row>
          ))}
        </Card>
      ) : null}

      {opp.schedule ? (
        <Card style={{ gap: 8 }}>
          <Row gap={8}>
            <ClipboardList size={20} color={colors.brand} />
            <T variant="h2">Schedule</T>
          </Row>
          <T variant="body">{opp.schedule}</T>
        </Card>
      ) : null}

      {opp.resourceNeeds?.length ? (
        <View style={{ gap: 10 }}>
          <Heading eyebrow="के चाहिन्छ" title="What the campaign needs" text="Offer any of these in kind, alongside or instead of cash." />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {opp.resourceNeeds.map((r, i) => (
              <View key={r._id || i} style={[styles.needRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.sand }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="semibold">{r.description}</T>
                  <T variant="caption">{resourceLabel(r.type)}</T>
                </View>
                {r.quantity ? (
                  <T style={{ fontFamily: fonts.semibold, color: colors.pine }}>{formatNumber(r.quantity)} {r.unit}</T>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {/* Tiers */}
      <View style={{ gap: 12 }}>
        <Heading eyebrow="प्रायोजन प्याकेज" title="Sponsorship packages" text={tiers.length ? 'Pick a package, or propose your own.' : 'No fixed packages yet — propose what you would like to offer.'} />
        {tiers.map((t) => {
          const soldOut = t.slotsLeft === 0;
          return (
            <Card key={t._id} style={[{ gap: 10 }, soldOut && { opacity: 0.72 }]}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={10}>
                <View style={{ flex: 1, gap: 6 }}>
                  <TierLevelChip level={t.level} />
                  <T variant="h2">{t.name}</T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.pine }}>{priceText(t)}</T>
                  {t.price > 0 && t.priceNote ? <T variant="caption" style={{ textAlign: 'right', maxWidth: 140 }}>{t.priceNote}</T> : null}
                </View>
              </Row>
              {t.description ? <T variant="small">{t.description}</T> : null}
              {t.benefits?.length ? (
                <View style={{ gap: 6 }}>
                  {t.benefits.map((b, i) => (
                    <Row key={`${b}-${i}`} gap={8} style={{ alignItems: 'flex-start' }}>
                      <Check size={16} color={colors.pine} style={{ marginTop: 2 }} />
                      <T variant="body" style={{ flex: 1, fontSize: 15 }}>{b}</T>
                    </Row>
                  ))}
                </View>
              ) : null}
              <Divider />
              <Row style={{ justifyContent: 'space-between' }} gap={10}>
                <View style={{ flex: 1 }}>
                  <T variant="caption">{LOGO_SIZE_TEXT[t.logoSize] || ''}</T>
                  <T style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: soldOut ? colors.brand : colors.inkSoft }}>
                    {soldOut ? 'Sold out' : t.slotsLeft === null ? 'Open to several sponsors' : `${t.slotsLeft} of ${t.slots} ${t.slots === 1 ? 'slot' : 'slots'} left`}
                  </T>
                </View>
                {isOpen && !soldOut ? (
                  <Button title="Choose" size="sm" onPress={() => startApply(t._id)} accessibilityLabel={`Choose ${t.name}`} />
                ) : null}
              </Row>
            </Card>
          );
        })}
        {isOpen ? (
          <Card style={{ gap: 8, backgroundColor: colors.paperDeep }}>
            <Row gap={8}>
              <FilePenLine size={18} color={colors.brand} />
              <T variant="h3">Custom package</T>
            </Row>
            <T variant="small">Offer goods, services or an amount that suits you. The team will talk it through with you.</T>
            <Button title="Propose a custom package" variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => startApply(null)} />
          </Card>
        ) : null}
      </View>

      {/* Current sponsors */}
      <View style={{ gap: 12 }}>
        <Heading eyebrow="हाम्रा प्रायोजक" title="Current sponsors" />
        {sponsors.length ? (
          <Card style={{ gap: 14 }}>
            {sponsors.map((s) => (
              <Pressable
                key={String(s.deal)}
                disabled={!s.website}
                onPress={() => openLink(s.website)}
                accessibilityRole={s.website ? 'link' : undefined}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.7 }]}
              >
                <SponsorLogo uri={s.logoUrl} name={s.name} size={40} />
                <View style={{ flex: 1 }}>
                  <T variant="semibold" numberOfLines={1}>{s.name}</T>
                  {s.tier?.name ? <T variant="caption">{s.tier.name}</T> : null}
                </View>
                {s.website ? <ExternalLink size={16} color={colors.muted} /> : null}
              </Pressable>
            ))}
          </Card>
        ) : (
          <T variant="small">No sponsors confirmed yet{isOpen ? ' — yours could be the first.' : '.'}</T>
        )}
      </View>

      {/* Organisers */}
      {opp.organizers?.length ? (
        <View style={{ gap: 10 }}>
          <Heading title="Organised by" />
          <Card style={{ gap: 12 }}>
            {opp.organizers.map((o) => (
              <Pressable key={o._id} onPress={() => router.push(`/profile/${o._id}`)} accessibilityRole="link" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: 0.7 }]}>
                <Avatar name={o.name} src={o.profilePicture} size="md" />
                <T variant="semibold" style={{ flex: 1 }} numberOfLines={1}>{o.name}</T>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}

      {isOpen ? (
        <View style={styles.closing}>
          <T variant="h2" style={{ color: colors.white, textAlign: 'center' }}>Ready to back this campaign?</T>
          <T variant="small" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>Send a proposal — nothing is binding until both sides agree.</T>
          <Button title="Apply to sponsor" variant="ghost" full onPress={() => startApply(null)} />
        </View>
      ) : null}

      {user ? (
        <SponsorApplySheet visible={applyOpen} onClose={() => setApplyOpen(false)} opp={opp} initialTier={applyTier} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  staffBar: { backgroundColor: colors.ink, borderRadius: radius.card, padding: 14, gap: 10 },
  hero: { height: 240, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.paperDeep },
  overlayChip: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  overlayText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  factIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  factLabel: { textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.semibold, marginBottom: 2 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.lg },
  closing: { backgroundColor: colors.pine, borderRadius: radius.card, padding: 22, gap: 10, alignItems: 'center' },
});
