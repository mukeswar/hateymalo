import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { AlertTriangle, Palette } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { BRAND_ITEMS, renderBrandKitSvg } from '../../lib/brandKitSvg';
import { formatDate } from '../../lib/format';
import { colors, radius } from '../../theme';
import { Card, ChipBar, Loading, Row, T } from '../ui';
import { InfoNote, dateRange, idOf } from './SponsorBits';

// Read-only preview of the campaign's field branding (vests, banners…) for an
// agreed sponsor: GET /opportunities/:id/brand-kit rendered with brandKitSvg.
const ITEM_OPTIONS = Object.entries(BRAND_ITEMS).map(([value, v]) => ({ value, label: v.label }));

export default function SponsorBrandKitPreview({ opportunityId, dealId }) {
  const [kit, setKit] = useState(null);
  const [error, setError] = useState('');
  const [item, setItem] = useState('VEST_FRONT');
  const [width, setWidth] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`/sponsorship/opportunities/${opportunityId}/brand-kit`);
      setKit(res.data?.data || null);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'The brand kit is not available yet.'));
    }
  }, [opportunityId]);

  useEffect(() => { load(); }, [load]);

  const placed = useMemo(() => (kit?.slots || []).filter((s) => (s.placements || []).includes(item)), [kit, item]);

  const svg = useMemo(() => {
    if (!kit) return '';
    const opp = kit.opportunity || {};
    return renderBrandKitSvg({
      item,
      campaignLabel: kit.campaignLabel,
      accentColor: kit.accentColor,
      title: opp.title,
      dateText: opp.startDate ? dateRange(opp.startDate) : '',
      location: opp.location,
      sponsors: placed.map((s) => ({
        name: s.sponsorName,
        logoHref: s.logoUrl,
        size: s.size,
        order: s.order,
        logoUsageApproved: s.logoUsageApproved,
      })),
    });
  }, [kit, item, placed]);

  if (error) {
    return (
      <Card style={{ gap: 6 }}>
        <Row gap={8}><Palette size={18} color={colors.muted} /><T variant="h3">Campaign branding</T></Row>
        <T variant="small">{error}</T>
      </Card>
    );
  }
  if (!kit) return <Loading style={{ minHeight: 100 }} />;

  const spec = BRAND_ITEMS[item];
  const unapproved = placed.filter((s) => !s.logoUsageApproved).map((s) => s.sponsorName).filter(Boolean);
  const mine = (kit.slots || []).find((s) => idOf(s.deal) === dealId);
  const myPlacements = mine?.placements || [];

  return (
    <Card style={{ gap: 12 }}>
      <Row gap={8}>
        <Palette size={18} color={colors.brand} />
        <T variant="h3" style={{ flex: 1 }}>Campaign branding preview</T>
      </Row>
      <T variant="small">
        {kit.approvedAt ? `Approved by the Hateymalo team on ${formatDate(kit.approvedAt)}.` : 'Draft — the Hateymalo team has not approved this layout yet.'}
      </T>
      {mine ? (
        <T variant="small" style={{ color: colors.inkSoft }}>
          Your logo is placed on: {myPlacements.length ? myPlacements.map((p) => BRAND_ITEMS[p]?.label || p).join(', ') : 'no items yet'}.
        </T>
      ) : (
        <InfoNote tone="sky">Your logo has not been placed on the campaign materials yet.</InfoNote>
      )}
      <ChipBar options={ITEM_OPTIONS} value={item} onChange={setItem} style={{ paddingHorizontal: 0 }} />
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: 10, alignItems: 'center' }}
        accessibilityLabel={`${spec.label} preview`}
      >
        {width > 0 ? (() => {
          const maxW = width - 20;
          const maxH = 360;
          const scale = Math.min(maxW / spec.w, maxH / spec.h);
          return <SvgXml xml={svg} width={spec.w * scale} height={spec.h * scale} />;
        })() : null}
      </View>
      {unapproved.length ? (
        <InfoNote icon={AlertTriangle} tone="marigold">
          Not shown until their logo is approved: {unapproved.join(', ')}.
        </InfoNote>
      ) : null}
      {kit.notes ? <T variant="small">{kit.notes}</T> : null}
      <T variant="caption">Preview only. External logo images may not appear in every preview; final print files come from the Hateymalo team.</T>
    </Card>
  );
}

