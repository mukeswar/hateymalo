import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Download } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { formatDateTime, formatNPR, formatNumber, humanize, timeAgo } from '../../lib/format';
import { colors } from '../../theme';
import { Button, Card, Chip, Divider, Loading, Row, T } from '../ui';
import { Box, DateField, KV, Notice, Section, StatTile, isDateInput } from '../sponsorship/AdminSponsorKit';

// Shared pieces for the advertiser (sponsor/ads/*) and staff (admin/ads, admin/ad-campaign/[id],
// admin/adPlacements) advertising screens. Enums mirror docs/ADS.md and backend/models/AdCampaign.js.

export const CAMPAIGN_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PAUSED', 'ENDED', 'ARCHIVED'];
export const OBJECTIVES = ['AWARENESS', 'TRAFFIC', 'VOLUNTEERS', 'DONATIONS', 'EVENT_PROMOTION', 'OTHER'];
export const PRICING_MODELS = ['FLAT', 'CPM', 'CPC'];
export const AD_FORMATS = ['IMAGE', 'NATIVE', 'VIDEO'];
export const CTAS = ['LEARN_MORE', 'VISIT', 'SIGN_UP', 'DONATE', 'VOLUNTEER', 'SHOP', 'CONTACT', 'WATCH'];
export const CTA_LABELS = { LEARN_MORE: 'Learn more', VISIT: 'Visit', SIGN_UP: 'Sign up', DONATE: 'Donate', VOLUNTEER: 'Volunteer', SHOP: 'Shop now', CONTACT: 'Contact us', WATCH: 'Watch' };
export const LABEL_TEXTS = ['Sponsored', 'Advertisement', 'Promoted', 'प्रायोजित'];
export const SURFACES = ['WEB', 'APP'];
export const SURFACE_LABELS = { WEB: 'Website', APP: 'Mobile app' };
export const PRICING_LABELS = { FLAT: 'Flat price for the run', CPM: 'CPM — per 1,000 impressions', CPC: 'CPC — per click' };
export const FORMAT_LABELS = { IMAGE: 'Image', NATIVE: 'Sponsored card', VIDEO: 'Video' };

const TONES = {
  pine: { bg: colors.pineTint, fg: colors.pine },
  warn: { bg: colors.marigoldTint, fg: colors.marigoldText },
  brand: { bg: colors.brandTint, fg: colors.brand },
  sky: { bg: colors.skyTint, fg: colors.sky },
  plain: { bg: colors.paperDeep, fg: colors.inkSoft },
};

// deliveryStatus is the main badge (APPROVED splits into SCHEDULED / LIVE / FINISHED / BUDGET_SPENT / NO_CREATIVE)
export const DELIVERY = {
  DRAFT: { label: 'Draft', tone: TONES.plain },
  IN_REVIEW: { label: 'In review', tone: TONES.warn },
  APPROVED: { label: 'Approved', tone: TONES.pine },
  SCHEDULED: { label: 'Scheduled', tone: TONES.sky },
  LIVE: { label: 'Live', tone: TONES.pine },
  FINISHED: { label: 'Finished', tone: TONES.plain },
  BUDGET_SPENT: { label: 'Budget spent', tone: TONES.warn },
  NO_CREATIVE: { label: 'No approved creative', tone: TONES.brand },
  REJECTED: { label: 'Rejected', tone: TONES.brand },
  PAUSED: { label: 'Paused', tone: TONES.warn },
  ENDED: { label: 'Ended', tone: TONES.plain },
  ARCHIVED: { label: 'Archived', tone: TONES.plain },
};

export const DeliveryChip = ({ status, style }) => {
  const d = DELIVERY[status] || { label: humanize(status || ''), tone: TONES.plain };
  return <Chip label={d.label} tone={d.tone} style={[{ paddingVertical: 3, paddingHorizontal: 10 }, style]} />;
};

export const CreativeStatusChip = ({ status }) => {
  const tone = status === 'APPROVED' ? TONES.pine : status === 'REJECTED' ? TONES.brand : TONES.warn;
  return <Chip label={status === 'PENDING' ? 'Awaiting review' : humanize(status)} tone={tone} style={{ paddingVertical: 2, paddingHorizontal: 9 }} />;
};

// "Rs. 1,500 flat" / "Rs. 120 per 1,000 impressions" / "Rs. 8 per click"
export const priceLine = (c) => {
  if (!c) return '';
  if (c.pricingModel === 'FLAT') return c.flatPrice ? `${formatNPR(c.flatPrice)} for the whole run` : 'Quoted when placements and dates are set';
  const unit = c.pricingModel === 'CPM' ? 'per 1,000 impressions' : 'per click';
  return c.rate ? `${formatNPR(c.rate)} ${unit}` : 'Quoted when placements are set';
};

export const rateCardText = (rc = {}) =>
  [rc.flatPerDay ? `${formatNPR(rc.flatPerDay)}/day flat` : null, rc.cpm ? `${formatNPR(rc.cpm)} CPM` : null, rc.cpc ? `${formatNPR(rc.cpc)} CPC` : null]
    .filter(Boolean)
    .join(' · ') || 'Not on sale yet';

export const pctText = (n) => `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

export const dateSpan = (a, b) => {
  const f = (d) => (d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  return [f(a), f(b)].filter(Boolean).join(' – ');
};

/* ---------------- campaign card ---------------- */

// List card used by sponsor/ads and admin/ads.
export const CampaignCard = ({ c, href }) => (
  <Card onPress={() => router.push(href)} style={{ gap: 8 }} accessibilityLabel={`${c.title}, ${c.deliveryStatus}`}>
    <Row style={{ justifyContent: 'space-between' }} gap={8}>
      <DeliveryChip status={c.deliveryStatus} />
      <T variant="caption">Updated {timeAgo(c.updatedAt)}</T>
    </Row>
    <Row gap={8}>
      <T variant="h3" style={{ flex: 1 }} numberOfLines={2}>{c.title}</T>
      <ChevronRight size={18} color={colors.muted} />
    </Row>
    <T variant="small" numberOfLines={1}>
      {[c.advertiser?.name, dateSpan(c.startDate, c.endDate), `${(c.placements || []).length} placement${(c.placements || []).length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
    </T>
    <T variant="caption" style={{ color: colors.inkSoft }}>{priceLine(c)}</T>
    <Row wrap gap={14}>
      <T variant="caption"><T variant="caption" style={{ color: colors.ink }}>{formatNumber(c.totals?.impressions)}</T>{c.totals?.impressions === 1 ? ' impression' : ' impressions'}</T>
      <T variant="caption"><T variant="caption" style={{ color: colors.ink }}>{formatNumber(c.totals?.clicks)}</T>{c.totals?.clicks === 1 ? ' click' : ' clicks'}</T>
      <T variant="caption">CTR <T variant="caption" style={{ color: colors.ink }}>{pctText(c.ctr)}</T></T>
      <T variant="caption">Spend <T variant="caption" style={{ color: colors.pine }}>{formatNPR(c.spend)}</T></T>
    </Row>
    {c.status === 'REJECTED' && c.rejectionReason ? <T variant="small" style={{ color: colors.brand }} numberOfLines={2}>{c.rejectionReason}</T> : null}
  </Card>
);

/* ---------------- history ---------------- */

export const HistoryList = ({ history = [] }) =>
  history.length ? (
    <Section title="History">
      <Box>
        {[...history].reverse().map((h, i) => (
          <View key={`${h.at}-${i}`} style={{ gap: 2 }}>
            {i > 0 ? <Divider style={{ marginBottom: 8 }} /> : null}
            <Row gap={8} wrap>
              <DeliveryChip status={h.status} />
              <T variant="caption">{formatDateTime(h.at)}{h.by?.name ? ` · ${h.by.name}` : ''}</T>
            </Row>
            {h.note ? <T variant="small" style={{ color: colors.inkSoft }}>{h.note}</T> : null}
          </View>
        ))}
      </Box>
    </Section>
  ) : null;

/* ---------------- report ---------------- */

const MetricRow = ({ title, sub, r, spend }) => (
  <View style={{ gap: 2 }}>
    <Row style={{ justifyContent: 'space-between' }} gap={8}>
      <T variant="semibold" style={{ flex: 1, fontSize: 14.5 }} numberOfLines={1}>{title}</T>
      {spend !== undefined && spend !== null ? <T variant="semibold" style={{ fontSize: 14, color: colors.pine }}>{formatNPR(spend)}</T> : null}
    </Row>
    {sub ? <T variant="caption">{sub}</T> : null}
    <T variant="caption" style={{ color: colors.inkSoft }}>
      {`${formatNumber(r.impressions)} impressions · ${formatNumber(r.viewable)} viewable · ${formatNumber(r.clicks)} clicks · CTR ${pctText(r.ctr)}`}
      {r.videoStarts ? ` · ${formatNumber(r.videoStarts)} video starts, ${formatNumber(r.videoComplete)} completed` : ''}
      {r.filteredImpressions || r.filteredClicks ? ` · filtered ${formatNumber(r.filteredImpressions)} / ${formatNumber(r.filteredClicks)}` : ''}
    </T>
  </View>
);

const downloadCsv = async (id, range, showToast) => {
  try {
    const res = await API.get(`/ads/campaigns/${id}/report`, { params: { ...range, format: 'csv' }, responseType: 'text', transformResponse: (x) => x });
    const csv = typeof res.data === 'string' ? res.data : '';
    if (!csv) return showToast?.('Nothing to export yet', 'info');
    const name = `hateymalo-ad-${id}-${range.from || 'start'}-to-${range.to || 'today'}.csv`;
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return undefined;
    }
    await Share.share({ title: name, message: csv });
  } catch (err) {
    showToast?.(errorMessage(err, 'Could not export the report'), 'error');
  }
  return undefined;
};

// GET /ads/campaigns/:id/report — totals, daily, by creative, by placement; filtered traffic separately.
export const CampaignReport = ({ campaignId, showToast, reloadKey = 0 }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState({});
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/ads/campaigns/${campaignId}/report`, { params: range });
      setData(res.data?.data || null);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load the report.'));
    } finally {
      setLoading(false);
    }
  }, [campaignId, range]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const apply = () => {
    if (!isDateInput(from) || !isDateInput(to)) return showToast?.('Use the format YYYY-MM-DD', 'warning');
    setRange({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
    return undefined;
  };

  const t = data?.totals;
  const hasTraffic = t && (t.served || t.impressions || t.clicks || t.filteredImpressions || t.filteredClicks);

  return (
    <Section
      title="Report"
      hint={data?.range ? `${data.range.from} to ${data.range.to} (Nepal time)` : 'Delivery and results'}
      right={<Button title="CSV" icon={Download} size="sm" variant="ghost" loading={exporting} onPress={async () => { setExporting(true); await downloadCsv(campaignId, range, showToast); setExporting(false); }} />}
    >
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><DateField label="From" value={from} onChangeText={setFrom} /></View>
        <View style={{ flex: 1 }}><DateField label="To" value={to} onChangeText={setTo} /></View>
      </Row>
      <Row gap={8}>
        <Button title="Apply dates" size="sm" variant="soft" onPress={apply} />
        {range.from || range.to ? <Button title="Whole run" size="sm" variant="text" onPress={() => { setFrom(''); setTo(''); setRange({}); }} /> : null}
      </Row>

      {loading && !data ? <Loading /> : error && !data ? <Notice>{error}</Notice> : !t ? null : (
        <>
          <Row wrap gap={10}>
            <StatTile label="Impressions" value={formatNumber(t.impressions)} hint={`${formatNumber(t.served)} served`} />
            <StatTile label="Viewable" value={formatNumber(t.viewable)} hint={`${pctText(t.viewableRate)} of impressions`} />
            <StatTile label="Clicks" value={formatNumber(t.clicks)} hint={`CTR ${pctText(t.ctr)}`} />
            <StatTile label="Spend to date" value={formatNPR(t.spend)} tone="pine" hint="Whole run" />
          </Row>
          {t.videoStarts ? (
            <Box>
              <T variant="semibold" style={{ fontSize: 14.5 }}>Video</T>
              <KV label="Starts" value={formatNumber(t.videoStarts)} />
              <KV label="25% / 50% / 75%" value={`${formatNumber(t.videoQ25)} / ${formatNumber(t.videoQ50)} / ${formatNumber(t.videoQ75)}`} />
              <KV label="Completed" value={`${formatNumber(t.videoComplete)} (${pctText(t.completionRate)})`} />
              <KV label="Skipped" value={formatNumber(t.videoSkips)} />
            </Box>
          ) : null}
          <Box tone="paper">
            <T variant="semibold" style={{ fontSize: 14.5 }}>Filtered traffic (not billed)</T>
            <KV label="Filtered impressions" value={formatNumber(t.filteredImpressions)} />
            <KV label="Filtered clicks" value={formatNumber(t.filteredClicks)} />
          </Box>

          {!hasTraffic ? (
            <T variant="small">No delivery in this period yet. Numbers appear here as soon as the ad is shown.</T>
          ) : (
            <>
              {data.days?.length ? (
                <Box>
                  <T variant="semibold" style={{ fontSize: 14.5 }}>By day</T>
                  {data.days.slice().reverse().map((d, i) => (
                    <View key={d.day} style={{ gap: 8 }}>
                      {i > 0 ? <Divider /> : null}
                      <MetricRow title={d.day} r={d} spend={d.spend} />
                    </View>
                  ))}
                </Box>
              ) : null}
              {data.byCreative?.length ? (
                <Box>
                  <T variant="semibold" style={{ fontSize: 14.5 }}>By creative</T>
                  {data.byCreative.map((r, i) => (
                    <View key={r.creative} style={{ gap: 8 }}>
                      {i > 0 ? <Divider /> : null}
                      <MetricRow title={r.name} r={r} />
                    </View>
                  ))}
                </Box>
              ) : null}
              {data.byPlacement?.length ? (
                <Box>
                  <T variant="semibold" style={{ fontSize: 14.5 }}>By placement</T>
                  {data.byPlacement.map((r, i) => (
                    <View key={`${r.placement}-${r.surface}`} style={{ gap: 8 }}>
                      {i > 0 ? <Divider /> : null}
                      <MetricRow title={r.placement} sub={SURFACE_LABELS[r.surface] || r.surface} r={r} />
                    </View>
                  ))}
                </Box>
              ) : null}
            </>
          )}
          {(data.notes || []).map((n) => <T key={n} variant="caption">{n}</T>)}
        </>
      )}
    </Section>
  );
};

