import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { BookOpenText, ReceiptText, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, formatNumber } from '../../lib/format';
import { colors, fonts, space } from '../../theme';
import { Button, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { Box, DateField, Section, StatTile, isDateInput, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { SOURCE_LABELS, STAGES, STAGE_LABELS, formatPaisa } from '../../components/revenue/RevenueBits';

const TITLE = findSection('revenue')?.label || 'Revenue';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => {
  const [y, m] = String(ym).split('-');
  return `${MONTHS[Number(m) - 1] || m} ${String(y).slice(2)}`;
};

// 12 months of received (pine) vs spent (crimson), plain Views (web: chart).
const MonthBars = ({ months = [] }) => {
  const max = Math.max(1, ...months.flatMap((m) => [Math.abs(m.RECEIVED || 0), Math.abs(m.SPENT || 0)]));
  const any = months.some((m) => m.RECEIVED || m.SPENT);
  return (
    <View style={{ gap: 8 }}>
      <Row gap={14}>
        <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.pine }} /><T variant="caption">Received</T></Row>
        <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.brand }} /><T variant="caption">Spent</T></Row>
      </Row>
      <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }} accessibilityLabel="Received and spent by month">
        {months.map((m) => (
          <View
            key={m.month}
            style={{ flex: 1, height: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 }}
            accessible
            accessibilityLabel={`${monthLabel(m.month)}: received ${formatPaisa(m.RECEIVED)}, spent ${formatPaisa(m.SPENT)}`}
          >
            <View style={{ flex: 1, maxWidth: 12, height: `${m.RECEIVED ? Math.max(3, (Math.abs(m.RECEIVED) / max) * 100) : 0}%`, backgroundColor: colors.pine, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
            <View style={{ flex: 1, maxWidth: 12, height: `${m.SPENT ? Math.max(3, (Math.abs(m.SPENT) / max) * 100) : 0}%`, backgroundColor: colors.brand, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: colors.sand }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption">{months[0] ? monthLabel(months[0].month) : ''}</T>
        <T variant="caption">{months.length ? monthLabel(months[months.length - 1].month) : ''}</T>
      </Row>
      {!any ? <T variant="small">No money received or spent in the last 12 months yet.</T> : null}
    </View>
  );
};

// Web: SuperAdminDashboard "revenue" tab. GET /revenue/summary?from=&to= (default: current fiscal year).
// Finance (canManageRevenue) gets access 'FULL' with bySource and VAT; summary viewers get totals only.
export default function AdminRevenue() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState('');
  const sum = useSponsorApi(`/revenue/summary${range}`, { fallback: 'Could not load the revenue summary.' });
  const finance = can('canManageRevenue');

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    sum.reload();
  }, [sum.reload])); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!isDateInput(from) || !isDateInput(to)) return showToast('Use the format YYYY-MM-DD', 'warning');
    const p = [from && `from=${from}`, to && `to=${to}`].filter(Boolean).join('&');
    setRange(p ? `?${p}` : '');
    return undefined;
  };

  const d = sum.data;
  if (sum.loading && !d) return <><Stack.Screen options={{ title: TITLE }} /><Loading /></>;

  return (
    <Screen refreshing={sum.refreshing} onRefresh={sum.refresh}>
      <Stack.Screen options={{ title: TITLE }} />
      <T variant="small">Every money event is its own stage — contracted, invoiced, received, spent. Stages are never added together.</T>
      {finance ? (
        <Row wrap gap={10}>
          <Button title="Invoices" icon={ReceiptText} size="sm" variant="ghost" onPress={() => router.push('/admin/invoices')} />
          <Button title="Ledger" icon={BookOpenText} size="sm" variant="ghost" onPress={() => router.push('/admin/ledger')} />
        </Row>
      ) : null}

      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><DateField label="From" value={from} onChangeText={setFrom} /></View>
        <View style={{ flex: 1 }}><DateField label="To" value={to} onChangeText={setTo} /></View>
      </Row>
      <Row gap={8}>
        <Button title="Apply dates" size="sm" variant="soft" onPress={apply} />
        {range ? <Button title="This fiscal year" size="sm" variant="text" onPress={() => { setFrom(''); setTo(''); setRange(''); }} /> : null}
      </Row>

      {sum.error && !d ? (
        sum.status === 403 ? <EmptyState icon={TrendingUp} title="No access" message={sum.error} /> : <ErrorState message={sum.error} onRetry={() => sum.reload()} />
      ) : d ? (
        <>
          <T variant="caption">
            {`${d.range?.fiscalYear && !range ? `Fiscal year ${d.range.fiscalYear} · ` : ''}${d.range?.from ? formatDate(d.range.from) : 'Start'} – ${d.range?.to ? formatDate(d.range.to) : 'today'}`}
          </T>

          <Section title="Stages">
            <Row wrap gap={10}>
              {STAGES.map((s) => (
                <StatTile key={s} label={STAGE_LABELS[s]} value={formatPaisa(d.byStage?.[s])} tone={s === 'RECEIVED' ? 'pine' : undefined} />
              ))}
            </Row>
            <Box tone={d.netPaisa < 0 ? 'warn' : 'pine'}>
              <Row style={{ justifyContent: 'space-between' }} gap={8}>
                <T variant="semibold">Net (received − spent)</T>
                <T style={{ fontFamily: fonts.bold, fontSize: 18, color: d.netPaisa < 0 ? colors.brand : colors.pine }}>{formatPaisa(d.netPaisa)}</T>
              </Row>
            </Box>
          </Section>

          <Section title="Receivables" hint="Issued invoices not yet paid in full (any date).">
            <Row wrap gap={10}>
              <StatTile label="Outstanding" value={formatPaisa(d.receivables?.outstandingPaisa)} hint={`${formatNumber(d.receivables?.openCount)} open invoice${d.receivables?.openCount === 1 ? '' : 's'}`} />
              <StatTile label="Overdue" value={formatPaisa(d.receivables?.overduePaisa)} hint={`${formatNumber(d.receivables?.overdueCount)} past due date`} tone={d.receivables?.overdueCount ? 'warn' : undefined} />
            </Row>
            {finance && d.receivables?.overdueCount ? <Button title="See overdue invoices" size="sm" variant="text" onPress={() => router.push('/admin/invoices?filter=OVERDUE')} /> : null}
          </Section>

          <Section title="Pipeline">
            <Row wrap gap={10}>
              <StatTile label="Projected sponsorship" value={formatPaisa(d.projected?.sponsorshipPaisa)} hint={`${formatNumber(d.projected?.openDeals)} proposal${d.projected?.openDeals === 1 ? '' : 's'} under discussion`} />
              <StatTile label="Projected advertising" value={formatPaisa(d.projected?.advertisingPaisa)} hint={`${formatNumber(d.projected?.adsInReview)} ad${d.projected?.adsInReview === 1 ? '' : 's'} in review`} />
              <StatTile label="Contracted, not invoiced" value={formatPaisa(d.uninvoicedPaisa)} hint="Agreed deals and approved ads" />
            </Row>
          </Section>

          <Section title="Last 12 months">
            <Box><MonthBars months={d.months || []} /></Box>
          </Section>

          {d.access === 'FULL' && d.bySource ? (
            <Section title="By revenue stream">
              <Box>
                {Object.entries(d.bySource).map(([src, v], i) => (
                  <View key={src} style={{ gap: 4, paddingTop: i ? 8 : 0, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand }}>
                    <T variant="semibold" style={{ fontSize: 14.5 }}>{SOURCE_LABELS[src] || src}</T>
                    <Row wrap gap={12}>
                      {STAGES.map((s) => (
                        <T key={s} variant="caption">{`${STAGE_LABELS[s]} `}<T variant="caption" style={{ color: s === 'RECEIVED' ? colors.pine : colors.ink }}>{formatPaisa(v?.[s])}</T></T>
                      ))}
                    </Row>
                  </View>
                ))}
                {!Object.keys(d.bySource).length ? <T variant="small">No ledger rows in this period.</T> : null}
              </Box>
            </Section>
          ) : null}

          {d.access === 'FULL' && d.vat ? (
            <Section title="VAT" hint="VAT is collected for the government and is not income.">
              <Box>
                <T variant="small">{d.vat.registered ? `VAT registered · ${d.vat.rate}%` : 'Not VAT registered — invoices carry no VAT.'}</T>
                <Row wrap gap={10}>
                  <StatTile label="VAT invoiced" value={formatPaisa(d.vat.invoicedPaisa)} />
                  <StatTile label="VAT received" value={formatPaisa(d.vat.receivedPaisa)} />
                </Row>
              </Box>
            </Section>
          ) : null}

          {d.access === 'SUMMARY' ? <T variant="caption">You see totals only. Stream and VAT breakdowns are for finance staff.</T> : null}
          {(d.notes || []).length ? (
            <View style={{ gap: 4, marginBottom: space.lg }}>
              {d.notes.map((n) => <T key={n} variant="caption">{`• ${n}`}</T>)}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
