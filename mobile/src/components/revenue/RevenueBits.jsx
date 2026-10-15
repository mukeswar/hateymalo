import React, { useCallback, useRef } from 'react';
import { Platform, Share, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, FilePlus, ReceiptText } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { formatDate, humanize } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, Chip, Divider, Loading, Row, T } from '../ui';
import { Box, Notice, Section, useSponsorApi } from '../sponsorship/AdminSponsorKit';

// Shared pieces for the revenue ledger + invoices screens (docs/REVENUE.md):
// admin/revenue, admin/invoices, admin/invoice/[id], admin/ledger, sponsor/invoices/*,
// and the invoice lists on the admin deal and ad campaign screens.
// Money in this module is in PAISA in responses and NPR (2 decimals) in inputs.

export const STAGES = ['CONTRACTED', 'INVOICED', 'RECEIVED', 'SPENT'];
export const SOURCES = ['SPONSORSHIP', 'ADVERTISING', 'MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'];
export const OTHER_SOURCES = ['MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'];
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'];
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];
export const STAGE_LABELS = { CONTRACTED: 'Contracted', INVOICED: 'Invoiced', RECEIVED: 'Received', SPENT: 'Spent' };
export const SOURCE_LABELS = {
  SPONSORSHIP: 'Sponsorship',
  ADVERTISING: 'Advertising',
  MEDIA_PRODUCTION: 'Media production',
  CSR: 'CSR',
  MERCHANDISE: 'Merchandise',
  OTHER: 'Other',
};
export const OPEN_STATUSES = ['ISSUED', 'PARTIALLY_PAID'];

/* ---------- money ---------- */

// 123456 paisa → "Rs. 1,234.56"; negatives → "−Rs. 1,234.56"
export const formatPaisa = (p) => {
  const n = Math.round(Number(p) || 0);
  const s = `Rs. ${(Math.abs(n) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return n < 0 ? `−${s}` : s;
};
// Plain text for Share summaries (no unicode minus)
const paisaText = (p) => formatPaisa(p).replace('−', '-');

// Keep a typed NPR amount to digits and at most one dot with two decimals.
export const decimalInput = (v) => {
  const clean = String(v ?? '').replace(/[^0-9.]/g, '');
  const [whole, ...rest] = clean.split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
};
export const nprToPaisa = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};
export const paisaToInput = (p) => {
  const n = Math.max(0, Math.round(Number(p) || 0));
  return n % 100 ? (n / 100).toFixed(2) : String(n / 100);
};

// Same arithmetic as the server's computeTotals (quantity rounded to 2 decimals).
export const previewTotals = (lines, settings) => {
  const amounts = lines.map((l) => {
    const unit = nprToPaisa(l.unitPrice);
    const qty = Math.round(Number(l.quantity || 0) * 100) / 100;
    return Math.round(unit * (qty > 0 ? qty : 0));
  });
  const subtotal = amounts.reduce((s, a) => s + a, 0);
  const vatRegistered = !!settings?.vatRegistered;
  const vatRate = vatRegistered ? Number(settings?.vatRate) || 0 : 0;
  const vat = Math.round((subtotal * vatRate) / 100);
  return { amounts, subtotal, vat, vatRate, total: subtotal + vat, kind: vatRegistered ? 'TAX_INVOICE' : 'INVOICE' };
};

/* ---------- labels ---------- */

const TONES = {
  plain: { bg: colors.paperDeep, fg: colors.inkSoft },
  sky: { bg: colors.skyTint, fg: colors.sky },
  warn: { bg: colors.marigoldTint, fg: colors.marigoldText },
  pine: { bg: colors.pineTint, fg: colors.pine },
  brand: { bg: colors.brandTint, fg: colors.brand },
};
const STATUS = {
  DRAFT: { label: 'Draft', tone: TONES.plain },
  ISSUED: { label: 'Issued', tone: TONES.sky },
  PARTIALLY_PAID: { label: 'Partly paid', tone: TONES.warn },
  PAID: { label: 'Paid', tone: TONES.pine },
  VOID: { label: 'Void', tone: TONES.brand },
};
export const statusLabel = (s) => STATUS[s]?.label || humanize(s || '');

export const InvoiceStatusChip = ({ status }) => {
  const s = STATUS[status] || { label: humanize(status || ''), tone: TONES.plain };
  return <Chip label={s.label} tone={s.tone} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />;
};
export const OverdueChip = () => <Chip label="Overdue" tone={{ bg: colors.brand, fg: colors.white }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />;

export const invoiceNumber = (inv) => inv?.number || 'Draft';
export const kindLabel = (inv) => (inv?.kind === 'TAX_INVOICE' ? 'TAX INVOICE' : 'INVOICE');

export const subjectLabel = (inv) => {
  if (!inv) return '';
  if (inv.subjectType === 'SPONSORSHIP_DEAL') return 'Sponsorship deal';
  if (inv.subjectType === 'AD_CAMPAIGN') return inv.adCampaign?.title ? `Ad campaign · ${inv.adCampaign.title}` : 'Ad campaign';
  return SOURCE_LABELS[inv.source] || humanize(inv.source || 'Other income');
};

/* ---------- cards ---------- */

export const InvoiceCard = ({ inv, href, compact = false }) => (
  <Card onPress={() => router.push(href)} style={{ gap: 6 }} accessibilityLabel={`Invoice ${invoiceNumber(inv)}, ${statusLabel(inv.status)}${inv.overdue ? ', overdue' : ''}`}>
    <Row style={{ justifyContent: 'space-between' }} gap={8}>
      <Row gap={6} wrap style={{ flex: 1 }}>
        <InvoiceStatusChip status={inv.status} />
        {inv.overdue ? <OverdueChip /> : null}
      </Row>
      <ChevronRight size={18} color={colors.muted} />
    </Row>
    <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }} gap={8}>
      <T variant="semibold" style={{ flex: 1, fontSize: 15.5 }} numberOfLines={1}>{invoiceNumber(inv)}</T>
      <T style={{ fontFamily: fonts.bold, fontSize: 15.5, color: colors.ink }}>{formatPaisa(inv.totalPaisa)}</T>
    </Row>
    {!compact ? <T variant="small" numberOfLines={1}>{[inv.sponsorAccount?.name, subjectLabel(inv)].filter(Boolean).join(' · ')}</T> : null}
    <Row wrap gap={12}>
      {inv.issueDate ? <T variant="caption">{`Issued ${formatDate(inv.issueDate)}`}</T> : <T variant="caption">Not issued yet</T>}
      {inv.dueDate ? <T variant="caption" style={{ color: inv.overdue ? colors.brand : colors.muted }}>{`Due ${formatDate(inv.dueDate)}`}</T> : null}
      {inv.status !== 'DRAFT' && inv.status !== 'VOID' ? (
        <T variant="caption" style={{ color: inv.balancePaisa > 0 ? colors.marigoldText : colors.pine }}>{inv.balancePaisa > 0 ? `Balance ${formatPaisa(inv.balancePaisa)}` : 'Paid in full'}</T>
      ) : null}
    </Row>
  </Card>
);

// Invoices of one deal or ad campaign (finance), with a "Create invoice" shortcut.
// `query` e.g. "deal=<id>" or "adCampaign=<id>"; `createHref` opens the new-invoice form prefilled.
export const SubjectInvoices = ({ query, createHref, hint }) => {
  const list = useSponsorApi(`/revenue/invoices?${query}`, { fallback: 'Could not load invoices.' });
  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    list.reload();
  }, [list.reload])); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = list.data || [];
  return (
    <Section
      title="Invoices"
      hint={hint}
      right={createHref ? <Button title="Create invoice" icon={FilePlus} size="sm" variant="ghost" onPress={() => router.push(createHref)} /> : null}
    >
      {list.loading && !list.data ? <Loading /> : list.error && !list.data ? <Notice>{list.error}</Notice> : rows.length ? (
        <View style={{ gap: space.sm }}>
          {rows.map((inv) => <InvoiceCard key={inv._id} inv={inv} href={`/admin/invoice/${inv._id}`} compact />)}
        </View>
      ) : (
        <T variant="small">No invoices yet.</T>
      )}
    </Section>
  );
};

/* ---------- printable layout ---------- */

const PartyBlock = ({ title, party, fallbackName, emptyHint }) => (
  <View style={{ flex: 1, minWidth: 140, gap: 2 }}>
    <T variant="eyebrow" style={{ color: colors.muted }}>{title}</T>
    {party?.name || fallbackName ? <T variant="semibold" style={{ fontSize: 15 }}>{party?.name || fallbackName}</T> : null}
    {party?.pan ? <T variant="small">{`PAN ${party.pan}`}</T> : null}
    {party?.address ? <T variant="small">{party.address}</T> : null}
    {party?.email ? <T variant="small">{party.email}</T> : null}
    {party?.phone ? <T variant="small">{party.phone}</T> : null}
    {!party?.name && emptyHint ? <T variant="caption">{emptyHint}</T> : null}
  </View>
);

const TotalRow = ({ label, value, strong, color }) => (
  <Row style={{ justifyContent: 'space-between' }} gap={12}>
    <T variant={strong ? 'semibold' : 'small'} style={{ color: strong ? colors.ink : colors.muted }}>{label}</T>
    <T style={{ fontFamily: strong ? fonts.bold : fonts.semibold, fontSize: strong ? 16 : 14.5, color: color || colors.ink }}>{value}</T>
  </Row>
);

// Same blocks as the web print view: seller, TAX INVOICE / INVOICE, number and dates, bill-to,
// lines, subtotal, VAT (tax invoices only), total, paid / balance, payment instructions, footer, VOID.
export const InvoiceDocument = ({ inv }) => {
  const isVoid = inv.status === 'VOID';
  const isDraft = inv.status === 'DRAFT';
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand, borderRadius: radius.md, padding: space.lg, gap: space.md }}>
      {isVoid ? (
        <View style={{ borderWidth: 2, borderColor: colors.brand, borderRadius: radius.sm, paddingVertical: 6, alignItems: 'center', gap: 2 }} accessibilityRole="alert">
          <T style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: 6, color: colors.brand }}>VOID</T>
          {inv.voidReason ? <T variant="small" style={{ color: colors.brand, textAlign: 'center', paddingHorizontal: space.sm }}>{inv.voidReason}</T> : null}
        </View>
      ) : null}
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12} wrap>
        <PartyBlock title="From" party={inv.seller} emptyHint={isDraft ? 'Filled in from the billing profile when issued.' : ''} />
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <T style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink, letterSpacing: 1 }}>{kindLabel(inv)}</T>
          <T variant="semibold" style={{ fontSize: 14.5 }}>{invoiceNumber(inv)}</T>
          {inv.issueDate ? <T variant="caption">{`Issued ${formatDate(inv.issueDate)}`}</T> : null}
          {inv.dueDate ? <T variant="caption" style={{ color: inv.overdue ? colors.brand : colors.muted }}>{`Due ${formatDate(inv.dueDate)}${inv.overdue ? ' · overdue' : ''}`}</T> : null}
          {inv.fiscalYear ? <T variant="caption">{`FY ${inv.fiscalYear}`}</T> : null}
        </View>
      </Row>
      <Divider />
      <PartyBlock title="Bill to" party={inv.billTo} fallbackName={inv.sponsorAccount?.name} emptyHint={isDraft ? 'PAN and address are copied from the sponsor account when issued.' : ''} />
      <T variant="caption">{`For: ${subjectLabel(inv)}`}</T>
      <Divider />
      <View style={{ gap: 10 }}>
        {(inv.lines || []).map((l, i) => (
          <View key={l._id || i} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={12}>
              <T variant="body" style={{ flex: 1 }}>{l.description}</T>
              <T variant="semibold" style={{ fontSize: 14.5 }}>{formatPaisa(l.amountPaisa)}</T>
            </Row>
            <T variant="caption">{`${Number(l.quantity).toLocaleString('en-IN')} × ${formatPaisa(l.unitPricePaisa)}`}</T>
          </View>
        ))}
      </View>
      <Divider />
      <View style={{ gap: 6 }}>
        <TotalRow label="Subtotal" value={formatPaisa(inv.subtotalPaisa)} />
        {inv.kind === 'TAX_INVOICE' ? <TotalRow label={`VAT (${Number(inv.vatRate || 0)}%)`} value={formatPaisa(inv.vatPaisa)} /> : null}
        <TotalRow label="Total" value={formatPaisa(inv.totalPaisa)} strong />
        {!isDraft ? <TotalRow label="Paid" value={formatPaisa(inv.paidPaisa)} color={colors.pine} /> : null}
        {!isDraft && !isVoid ? <TotalRow label="Balance due" value={formatPaisa(inv.balancePaisa)} strong color={inv.balancePaisa > 0 ? colors.brand : colors.pine} /> : null}
      </View>
      {inv.notes ? <T variant="small" style={{ color: colors.inkSoft }}>{inv.notes}</T> : null}
      {inv.paymentInstructions ? (
        <Box tone="paper">
          <T variant="semibold" style={{ fontSize: 14 }}>How to pay</T>
          <T variant="small" selectable>{inv.paymentInstructions}</T>
        </Box>
      ) : null}
      {inv.footerNote ? <T variant="caption" style={{ textAlign: 'center' }}>{inv.footerNote}</T> : null}
    </View>
  );
};

// Plain-text summary for the native Share sheet.
export const invoiceText = (inv) => {
  const lines = [];
  if (inv.status === 'VOID') lines.push(`*** VOID${inv.voidReason ? ` — ${inv.voidReason}` : ''} ***`);
  lines.push(`${kindLabel(inv)} ${invoiceNumber(inv)}`);
  if (inv.seller?.name) lines.push(`From: ${inv.seller.name}${inv.seller.pan ? ` (PAN ${inv.seller.pan})` : ''}${inv.seller.address ? `, ${inv.seller.address}` : ''}`);
  const billName = inv.billTo?.name || inv.sponsorAccount?.name;
  if (billName) lines.push(`Bill to: ${billName}${inv.billTo?.pan ? ` (PAN ${inv.billTo.pan})` : ''}${inv.billTo?.address ? `, ${inv.billTo.address}` : ''}`);
  if (inv.issueDate) lines.push(`Issued: ${formatDate(inv.issueDate)}`);
  if (inv.dueDate) lines.push(`Due: ${formatDate(inv.dueDate)}`);
  lines.push('');
  (inv.lines || []).forEach((l) => lines.push(`${l.description} — ${Number(l.quantity)} × ${paisaText(l.unitPricePaisa)} = ${paisaText(l.amountPaisa)}`));
  lines.push('');
  lines.push(`Subtotal: ${paisaText(inv.subtotalPaisa)}`);
  if (inv.kind === 'TAX_INVOICE') lines.push(`VAT (${Number(inv.vatRate || 0)}%): ${paisaText(inv.vatPaisa)}`);
  lines.push(`Total: ${paisaText(inv.totalPaisa)}`);
  if (inv.status !== 'DRAFT') {
    lines.push(`Paid: ${paisaText(inv.paidPaisa)}`);
    if (inv.status !== 'VOID') lines.push(`Balance due: ${paisaText(inv.balancePaisa)}`);
  }
  if (inv.paymentInstructions) lines.push('', `How to pay: ${inv.paymentInstructions}`);
  if (inv.footerNote) lines.push('', inv.footerNote);
  return lines.join('\n');
};

export const shareInvoice = async (inv, showToast) => {
  const message = invoiceText(inv);
  try {
    if (Platform.OS === 'web') {
      if (globalThis.navigator?.share) await globalThis.navigator.share({ title: `Invoice ${invoiceNumber(inv)}`, text: message });
      else if (globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(message);
        showToast?.('Invoice summary copied', 'success');
      }
      return;
    }
    await Share.share({ title: `Invoice ${invoiceNumber(inv)}`, message });
  } catch (err) {
    if (err?.name !== 'AbortError') showToast?.(errorMessage(err, 'Could not share the invoice'), 'error');
  }
};

export const PaymentsList = ({ payments = [], renderAction }) =>
  payments.length ? (
    <View style={{ gap: space.sm }}>
      {payments.map((p) => (
        <Box key={p._id}>
          <Row style={{ justifyContent: 'space-between' }} gap={8}>
            <T variant="semibold">{formatPaisa(p.amountPaisa)}</T>
            <T variant="caption">{formatDate(p.receivedAt)}</T>
          </Row>
          <T variant="small">{`${humanize(p.method)}${p.reference ? ` · ${p.reference}` : ''}`}</T>
          {p.note ? <T variant="small">{p.note}</T> : null}
          {p.recordedBy?.name ? <T variant="caption">{`Recorded by ${p.recordedBy.name}`}</T> : null}
          {renderAction ? renderAction(p) : null}
        </Box>
      ))}
    </View>
  ) : (
    <T variant="small">No payments recorded yet.</T>
  );

export const EmptyInvoices = ({ message }) => (
  <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
    <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' }}>
      <ReceiptText size={24} color={colors.inkSoft} />
    </View>
    <T variant="small" style={{ textAlign: 'center' }}>{message}</T>
  </Card>
);

/* ---------- ledger CSV ---------- */

// GET /revenue/ledger?format=csv with auth → web download / native Share (same as AdBits).
export const downloadLedgerCsv = async (params, showToast) => {
  try {
    const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v));
    const res = await API.get('/revenue/ledger', { params: { ...clean, format: 'csv' }, responseType: 'text', transformResponse: (x) => x });
    const csv = typeof res.data === 'string' ? res.data : '';
    if (!csv) return showToast?.('Nothing to export yet', 'info');
    const name = `hateymalo-revenue-ledger-${params.from || 'start'}-to-${params.to || 'today'}.csv`;
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
    showToast?.(errorMessage(err, 'Could not export the ledger'), 'error');
  }
  return undefined;
};
