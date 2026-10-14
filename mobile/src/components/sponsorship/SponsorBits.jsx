import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react-native';
import { colors, fonts, radius, shadow, space } from '../../theme';
import { formatDate, formatNPR, humanize } from '../../lib/format';
import { Button, Card, Chip, Field, ProgressBar, Row, Select, T } from '../ui';

// Shared pieces of the public sponsorship pages and the sponsor portal
// (enums and rules from docs/SPONSORSHIP.md).

export const CAMPAIGN_TYPES = [
  { value: 'CLEANUP', label: 'Clean-up' },
  { value: 'BLOOD_DONATION', label: 'Blood donation' },
  { value: 'TREE_PLANTATION', label: 'Tree plantation' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'DISASTER_RELIEF', label: 'Disaster relief' },
  { value: 'FOOD_DISTRIBUTION', label: 'Food distribution' },
  { value: 'HEALTH', label: 'Health' },
  { value: 'OTHER', label: 'Other' },
];
export const campaignTypeLabel = (t) => CAMPAIGN_TYPES.find((c) => c.value === t)?.label || humanize(t || 'OTHER');

export const RESOURCE_TYPES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MATERIALS', label: 'Materials' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FOOD', label: 'Food' },
  { value: 'UNIFORMS', label: 'Uniforms' },
  { value: 'VENUE', label: 'Venue' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'OTHER', label: 'Other' },
];
export const resourceLabel = (t) => RESOURCE_TYPES.find((r) => r.value === t)?.label || humanize(t);

export const VALUATION_METHODS = [
  { value: 'SPONSOR_INVOICE', label: 'Invoice' },
  { value: 'MARKET_QUOTE', label: 'Market quote' },
  { value: 'SPONSOR_DECLARED', label: 'Our estimate' },
  { value: 'STAFF_ESTIMATE', label: 'Staff estimate' },
  { value: 'NOT_VALUED', label: 'Not valued' },
];
export const valuationLabel = (v) => VALUATION_METHODS.find((m) => m.value === v)?.label || humanize(v);

export const ACCOUNT_TYPES = [
  { value: 'COMPANY', label: 'Company' },
  { value: 'NGO', label: 'NGO' },
  { value: 'LOCAL_BUSINESS', label: 'Local business' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'OTHER', label: 'Other' },
];
export const accountTypeLabel = (t) => ACCOUNT_TYPES.find((a) => a.value === t)?.label || humanize(t);

export const TIER_LEVEL_TONE = {
  TITLE: { bg: colors.ink, fg: colors.white },
  GOLD: { bg: colors.marigoldTint, fg: colors.marigoldText },
  SILVER: { bg: colors.paperDeep, fg: colors.inkSoft },
  BRONZE: { bg: '#F5E3D3', fg: '#8A4B1E' },
  COMMUNITY_PARTNER: { bg: colors.pineTint, fg: colors.pine },
  MEDIA_PARTNER: { bg: colors.skyTint, fg: colors.sky },
  IN_KIND: { bg: colors.pineTint, fg: colors.pine },
  CUSTOM: { bg: colors.brandTint, fg: colors.brand },
};

export const STAGES = {
  APPLIED: { label: 'Applied', tone: { bg: colors.skyTint, fg: colors.sky }, next: 'Your proposal is with the Hateymalo team. They usually reply within a few days.' },
  IN_REVIEW: { label: 'In review', tone: { bg: colors.marigoldTint, fg: colors.marigoldText }, next: 'The team is reviewing your proposal. Keep an eye on the messages below.' },
  NEGOTIATING: { label: 'Negotiating', tone: { bg: colors.marigoldTint, fg: colors.marigoldText }, next: 'You are agreeing the details. Reply to messages and update your proposal if needed.' },
  AGREED: { label: 'Agreed', tone: { bg: colors.pineTint, fg: colors.pine }, next: 'Your sponsorship is confirmed. Approve your logo and follow the deliverables.' },
  FULFILLED: { label: 'Fulfilled', tone: { bg: colors.pine, fg: colors.white }, next: 'Everything was delivered. Thank you for backing this campaign.' },
  DECLINED: { label: 'Declined', tone: { bg: colors.brandTint, fg: colors.brand }, next: 'This proposal was not taken forward. You are welcome to apply to other campaigns.' },
  WITHDRAWN: { label: 'Withdrawn', tone: { bg: colors.paperDeep, fg: colors.muted }, next: 'You withdrew this proposal.' },
  CANCELLED: { label: 'Cancelled', tone: { bg: colors.brandTint, fg: colors.brand }, next: 'This sponsorship was cancelled. Message the team if you have questions.' },
};
export const STAGE_ORDER = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED', 'FULFILLED', 'DECLINED', 'WITHDRAWN', 'CANCELLED'];
export const EDITABLE_STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'];
export const CONTRACTED_STAGES = ['AGREED', 'FULFILLED'];

export const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
export const toInt = (v) => {
  const n = Math.round(Number(String(v ?? '').replace(/[^0-9.]/g, '')));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
export const idOf = (x) => (x && (x._id || x)) || null;

export const dateRange = (start, end) => {
  if (!start) return '';
  const a = formatDate(start, { day: 'numeric', month: 'short', year: 'numeric' });
  if (!end) return a;
  const b = formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' });
  return a === b ? a : `${formatDate(start, { day: 'numeric', month: 'short' })} – ${b}`;
};

export const priceText = (tierOrPrice) => {
  const price = typeof tierOrPrice === 'number' ? tierOrPrice : tierOrPrice?.price;
  if (price > 0) return formatNPR(price);
  return tierOrPrice?.priceNote || 'By quotation';
};

export const openLink = (url) => {
  if (!isHttpUrl(url)) return;
  WebBrowser.openBrowserAsync(url.trim()).catch(() => {});
};

/* ---------- Small visual pieces ---------- */

export const StageChip = ({ stage, style }) => {
  const s = STAGES[stage] || { label: humanize(stage), tone: { bg: colors.paperDeep, fg: colors.inkSoft } };
  return <Chip label={s.label} tone={s.tone} style={[{ paddingVertical: 3, paddingHorizontal: 10 }, style]} />;
};

export const VerificationChip = ({ status, style }) => {
  const map = {
    VERIFIED: { label: 'Verified', tone: { bg: colors.pineTint, fg: colors.pine } },
    PENDING: { label: 'Verification pending', tone: { bg: colors.marigoldTint, fg: colors.marigoldText } },
    REJECTED: { label: 'Not approved', tone: { bg: colors.brandTint, fg: colors.brand } },
  };
  const m = map[status] || map.PENDING;
  return <Chip label={m.label} tone={m.tone} style={[{ paddingVertical: 3, paddingHorizontal: 10 }, style]} />;
};

export const TierLevelChip = ({ level, label, style }) => (
  <Chip
    label={label || humanize(level)}
    tone={TIER_LEVEL_TONE[level] || TIER_LEVEL_TONE.CUSTOM}
    style={[{ paddingVertical: 3, paddingHorizontal: 10 }, style]}
  />
);

// Sponsor logo on a white tile; falls back to the organisation's initials.
export const SponsorLogo = ({ uri, name = '', size = 56, style }) => {
  const initials = String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View
      style={[{ width: size * 1.6, height: size, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 6 }, style]}
      accessibilityLabel={name ? `${name} logo` : 'Logo'}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={150} />
      ) : (
        <T style={{ fontFamily: fonts.displayBold, fontSize: size * 0.34, color: colors.inkSoft }}>{initials || '—'}</T>
      )}
    </View>
  );
};

export const InfoNote = ({ icon: Icon, tone = 'marigold', children, style }) => {
  const tones = {
    marigold: { bg: colors.marigoldTint, fg: colors.marigoldText },
    pine: { bg: colors.pineTint, fg: colors.pine },
    sky: { bg: colors.skyTint, fg: colors.sky },
    brand: { bg: colors.brandTint, fg: colors.brand },
  };
  const t = tones[tone] || tones.marigold;
  return (
    <View style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: t.bg, borderRadius: radius.md, padding: 12 }, style]}>
      {Icon ? <Icon size={18} color={t.fg} style={{ marginTop: 1 }} /> : null}
      <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>{children}</T>
    </View>
  );
};

export const Heading = ({ eyebrow, title, text, style }) => (
  <View style={[{ gap: 4 }, style]}>
    {eyebrow ? <T variant="eyebrowDeva">{eyebrow}</T> : null}
    <T variant="h2">{title}</T>
    {text ? <T variant="small">{text}</T> : null}
  </View>
);

// Multi-select chips (contribution types).
export const MultiChips = ({ label, options, values = [], onChange, style }) => (
  <View style={[{ gap: 8 }, style]}>
    {label ? <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T> : null}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <Chip
            key={o.value}
            label={o.label}
            active={on}
            onPress={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
          />
        );
      })}
    </View>
  </View>
);

// URL text field with a live image preview (only http(s) links are previewed).
export const UrlImageField = ({ label, value, onChangeText, hint, placeholder = 'https://…', previewHeight = 64 }) => {
  const bad = !!value && !isHttpUrl(value);
  return (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={bad ? 'Use an http(s) image link' : undefined}
        hint={hint}
      />
      {value && !bad ? <SponsorLogo uri={value.trim()} size={previewHeight} /> : null}
    </View>
  );
};

/* ---------- In-kind items editor ---------- */

export const blankInKind = () => ({ type: 'MATERIALS', description: '', quantity: '', unit: '', estimatedValue: '', valuationMethod: 'SPONSOR_DECLARED' });

export const cleanInKind = (items) =>
  (items || [])
    .filter((i) => String(i.description || '').trim())
    .map((i) => ({
      type: i.type,
      description: String(i.description).trim(),
      quantity: toInt(i.quantity),
      unit: String(i.unit || '').trim(),
      estimatedValue: toInt(i.estimatedValue),
      valuationMethod: toInt(i.estimatedValue) > 0 ? i.valuationMethod : 'NOT_VALUED',
    }));

export const InKindEditor = ({ items, onChange }) => {
  const set = (idx, patch) => onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <T variant="semibold" style={{ fontSize: 14.5 }}>In-kind items (optional)</T>
        <T variant="small">Goods or services instead of cash. Values are estimates only and are never counted as cash.</T>
      </View>
      {items.map((it, idx) => (
        <View key={idx} style={styles.inKindBox}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="eyebrow" style={{ color: colors.pine }}>Item {idx + 1}</T>
            <Pressable
              onPress={() => onChange(items.filter((_, i) => i !== idx))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove item ${idx + 1}`}
            >
              <Trash2 size={18} color={colors.brand} />
            </Pressable>
          </Row>
          <Select options={RESOURCE_TYPES.filter((r) => r.value !== 'CASH')} value={it.type} onChange={(v) => set(idx, { type: v })} />
          <Field label="What" value={it.description} onChangeText={(v) => set(idx, { description: v })} placeholder="e.g. 150 volunteer vests" maxLength={300} />
          <Row gap={10}>
            <Field style={{ flex: 1 }} label="Quantity" value={String(it.quantity ?? '')} onChangeText={(v) => set(idx, { quantity: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
            <Field style={{ flex: 1 }} label="Unit" value={it.unit} onChangeText={(v) => set(idx, { unit: v })} placeholder="pcs" maxLength={30} />
          </Row>
          <Field
            label="Estimated value (NPR, optional)"
            value={String(it.estimatedValue ?? '')}
            onChangeText={(v) => set(idx, { estimatedValue: v.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            hint="Estimated value — not cash"
          />
          {toInt(it.estimatedValue) > 0 ? (
            <Select label="How was it valued?" options={VALUATION_METHODS.filter((m) => m.value !== 'STAFF_ESTIMATE' && m.value !== 'NOT_VALUED')} value={it.valuationMethod} onChange={(v) => set(idx, { valuationMethod: v })} />
          ) : null}
        </View>
      ))}
      <Button title="Add an in-kind item" icon={Plus} variant="ghost" size="sm" onPress={() => onChange([...items, blankInKind()])} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
};

/* ---------- Opportunity card (list) ---------- */

export const OpportunityCard = ({ opp }) => {
  const pctSecured = opp.fundingSecuredPct;
  const sponsors = opp.sponsors || [];
  return (
    <Card
      padded={false}
      onPress={() => router.push(`/sponsor/${opp._id}`)}
      accessibilityLabel={`${opp.title}, ${campaignTypeLabel(opp.campaignType)}`}
      style={{ overflow: 'hidden' }}
    >
      <View style={styles.cover}>
        {opp.coverImage ? (
          <Image source={{ uri: opp.coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[colors.pine, colors.pineDark]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
        <View style={styles.coverChips}>
          <View style={[styles.overlayChip, shadow.soft]}>
            <T style={styles.overlayText}>{campaignTypeLabel(opp.campaignType)}</T>
          </View>
          {opp.status && opp.status !== 'OPEN' ? (
            <View style={[styles.overlayChip, { backgroundColor: colors.marigoldTint }]}>
              <T style={[styles.overlayText, { color: colors.marigoldText }]}>{humanize(opp.status)}</T>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ padding: space.lg, gap: 10 }}>
        <T variant="h2">{opp.title}</T>
        {opp.summary ? <T variant="small" numberOfLines={3}>{opp.summary}</T> : null}
        <View style={{ gap: 4 }}>
          {opp.startDate ? (
            <Row gap={6}>
              <CalendarDays size={14} color={colors.muted} />
              <T variant="small">{dateRange(opp.startDate, opp.endDate)}</T>
            </Row>
          ) : null}
          {opp.location ? (
            <Row gap={6}>
              <MapPin size={14} color={colors.muted} />
              <T variant="small" numberOfLines={1} style={{ flex: 1 }}>{opp.location}</T>
            </Row>
          ) : null}
        </View>

        {pctSecured !== null && pctSecured !== undefined ? (
          <View style={{ gap: 6 }} accessibilityLabel={`${pctSecured}% of the funding goal secured`}>
            <ProgressBar value={pctSecured} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="caption">Funding secured</T>
              <T style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: colors.marigoldText }}>{pctSecured}%{opp.fundingGoal ? ` of ${formatNPR(opp.fundingGoal)}` : ''}</T>
            </Row>
          </View>
        ) : null}

        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <T variant="caption">{opp.tierCount ? `${opp.tierCount} ${opp.tierCount === 1 ? 'package' : 'packages'} · from` : 'Packages'}</T>
            <T style={{ fontFamily: fonts.displayBold, fontSize: 18, color: colors.pine }}>
              {opp.startingPrice ? formatNPR(opp.startingPrice) : 'By quotation'}
            </T>
          </View>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14.5, color: colors.brand }}>See proposal</T>
        </Row>

        {sponsors.length > 0 ? (
          <View style={{ gap: 6 }}>
            <T variant="caption">Backed by</T>
            <Row gap={8} wrap>
              {sponsors.slice(0, 6).map((s) => (
                <SponsorLogo key={String(s.deal)} uri={s.logoUrl} name={s.name} size={30} />
              ))}
              {sponsors.length > 6 ? <T variant="caption">+{sponsors.length - 6}</T> : null}
            </Row>
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cover: { height: 150, backgroundColor: colors.paperDeep },
  coverChips: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  overlayChip: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  overlayText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.ink },
  inKindBox: { gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white },
});

