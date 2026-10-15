import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Save } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { humanize } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Field, Loading, Row, Select, Sheet, T } from '../ui';
import { SearchBar } from '../admin/content/kit';
import { Box, DateField, Notice, RowListEditor, isDateInput, toDateInput, useSponsorApi } from '../sponsorship/AdminSponsorKit';
import { OTHER_SOURCES, SOURCE_LABELS, decimalInput, formatPaisa, paisaToInput, previewTotals } from './RevenueBits';

// New invoice / edit draft (web: invoices tab → new/edit drawer).
// New: sponsor account → GET /revenue/billables → deal / ad campaign / other income (+ source)
// → lines prefilled with the remaining amount → totals preview with the billing profile's VAT
// → POST /revenue/invoices (DRAFT). Edit: PUT /revenue/invoices/:id { lines, dueDate, notes, source }.
// `preset` = { sponsorAccount: id, deal?: id, adCampaign?: id } (from the deal / campaign screens).

const SUBJECTS = [
  { value: 'SPONSORSHIP_DEAL', label: 'Sponsorship deal' },
  { value: 'AD_CAMPAIGN', label: 'Ad campaign' },
  { value: 'OTHER', label: 'Other income' },
];
const blankLine = { description: '', quantity: '1', unitPrice: '' };
const key = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const linesFrom = (inv) => (inv?.lines || []).map((l) => ({ _key: key(), description: l.description, quantity: String(l.quantity), unitPrice: paisaToInput(l.unitPricePaisa) }));

const AccountPicker = ({ value, onChange }) => {
  const accounts = useSponsorApi('/sponsorship/admin/accounts', { fallback: 'Could not load sponsor accounts.' });
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (accounts.data || []).filter((a) => !s || [a.name, a.panNumber, a.contactEmail].some((x) => String(x || '').toLowerCase().includes(s))).slice(0, 12);
  }, [accounts.data, q]);
  if (value) {
    return (
      <Box>
        <T variant="caption">Bill to</T>
        <Row style={{ justifyContent: 'space-between' }} gap={8}>
          <T variant="semibold" style={{ flex: 1 }}>{value.name}</T>
          <Button title="Change" size="sm" variant="text" onPress={() => onChange(null)} />
        </Row>
        {value.panNumber ? <T variant="caption">{`PAN ${value.panNumber}`}</T> : 'panNumber' in value ? <T variant="caption" style={{ color: colors.marigoldText }}>No PAN on this sponsor account.</T> : null}
      </Box>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <T variant="semibold" style={{ fontSize: 14.5 }}>Sponsor account</T>
      <SearchBar value={q} onChange={setQ} placeholder="Search name, PAN or email…" />
      {accounts.loading ? <Loading /> : accounts.error ? <Notice>{accounts.error}</Notice> : list.length ? (
        <View style={{ borderWidth: 1, borderColor: colors.sand, borderRadius: radius.md, overflow: 'hidden' }}>
          {list.map((a, i) => (
            <Pressable
              key={a._id}
              onPress={() => onChange(a)}
              accessibilityRole="button"
              accessibilityLabel={`Bill ${a.name}`}
              style={({ pressed }) => ({ padding: space.md, gap: 2, backgroundColor: pressed ? colors.paperDeep : colors.white, borderTopWidth: i ? 1 : 0, borderTopColor: colors.sand })}
            >
              <T variant="semibold" style={{ fontSize: 14.5 }}>{a.name}</T>
              <T variant="caption">{[humanize(a.verificationStatus || ''), a.panNumber ? `PAN ${a.panNumber}` : 'No PAN', a.contractedDeals ? `${a.contractedDeals} agreed deal${a.contractedDeals === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}</T>
            </Pressable>
          ))}
        </View>
      ) : (
        <T variant="small">{(accounts.data || []).length ? 'No matches.' : 'No sponsor accounts yet. Members register them from the sponsor portal.'}</T>
      )}
    </View>
  );
};

const SubjectOption = ({ item, active, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected: active }}
    accessibilityLabel={item.title}
    style={({ pressed }) => ({
      padding: space.md,
      gap: 2,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: active ? colors.ink : colors.sand,
      backgroundColor: pressed ? colors.paperDeep : colors.white,
    })}
  >
    <T variant="semibold" style={{ fontSize: 14.5 }}>{item.title}</T>
    <T variant="caption">{[item.tier, item.stage ? humanize(item.stage) : item.status ? humanize(item.status) : null, item.pricingModel].filter(Boolean).join(' · ')}</T>
    <T variant="caption" style={{ color: item.remainingPaisa > 0 ? colors.pine : colors.muted }}>
      {`Contracted ${formatPaisa(item.contractedPaisa)} · invoiced ${formatPaisa(item.invoicedPaisa)} · left ${formatPaisa(item.remainingPaisa)}`}
    </T>
  </Pressable>
);

export default function InvoiceEditor({ visible, onClose, invoice, preset, onSaved, showToast }) {
  const editing = !!invoice;
  const [account, setAccount] = useState(null);
  const [subjectType, setSubjectType] = useState('SPONSORSHIP_DEAL');
  const [subjectId, setSubjectId] = useState('');
  const [source, setSource] = useState('OTHER');
  const [lines, setLines] = useState([{ ...blankLine, _key: key() }]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [billables, setBillables] = useState(null);
  const [billablesError, setBillablesError] = useState('');
  const settings = useSponsorApi(visible ? '/revenue/settings' : null, { fallback: 'Could not load the billing profile.' });

  // Reset whenever the sheet opens
  useEffect(() => {
    if (!visible) return;
    if (invoice) {
      setAccount(invoice.sponsorAccount || null);
      setSubjectType(invoice.subjectType);
      setSubjectId(invoice.deal?._id || invoice.adCampaign?._id || '');
      setSource(invoice.source || 'OTHER');
      setLines(linesFrom(invoice).length ? linesFrom(invoice) : [{ ...blankLine, _key: key() }]);
      setDueDate(toDateInput(invoice.dueDate));
      setNotes(invoice.notes || '');
    } else {
      setAccount(preset?.sponsorAccount ? { _id: preset.sponsorAccount, name: preset.sponsorName || 'Sponsor account' } : null);
      setSubjectType(preset?.adCampaign ? 'AD_CAMPAIGN' : 'SPONSORSHIP_DEAL');
      setSubjectId(preset?.deal || preset?.adCampaign || '');
      setSource('OTHER');
      setLines([{ ...blankLine, _key: key() }]);
      setDueDate('');
      setNotes('');
    }
    setBillables(null);
    setBillablesError('');
  }, [visible, invoice, preset]);

  // What this sponsor can still be invoiced for
  const accountId = account?._id;
  useEffect(() => {
    if (!visible || editing || !accountId) return undefined;
    let alive = true;
    API.get('/revenue/billables', { params: { sponsorAccount: accountId } })
      .then((res) => { if (alive) { setBillables(res.data?.data || { deals: [], adCampaigns: [] }); setBillablesError(''); } })
      .catch((err) => { if (alive) setBillablesError(errorMessage(err, 'Could not load what can be invoiced.')); });
    return () => { alive = false; };
  }, [visible, editing, accountId]);

  const options = subjectType === 'SPONSORSHIP_DEAL' ? billables?.deals || [] : subjectType === 'AD_CAMPAIGN' ? billables?.adCampaigns || [] : [];
  const chosen = options.find((o) => String(o._id) === String(subjectId));

  // Prefill one line with the remaining amount once a preset subject's billables arrive
  useEffect(() => {
    if (!chosen || editing) return;
    setLines((cur) => (cur.length === 1 && !cur[0].description && !cur[0].unitPrice ? [{ _key: key(), description: chosen.tier ? `${chosen.title} — ${chosen.tier}` : chosen.title, quantity: '1', unitPrice: paisaToInput(chosen.remainingPaisa) }] : cur));
  }, [chosen, editing]);

  const pick = (item) => {
    setSubjectId(item._id);
    setLines([{ _key: key(), description: item.tier ? `${item.title} — ${item.tier}` : item.title, quantity: '1', unitPrice: paisaToInput(item.remainingPaisa) }]);
  };

  const totals = previewTotals(lines, settings.data);
  const billing = editing ? invoice.billing : chosen ? { remainingPaisa: chosen.remainingPaisa, contractedPaisa: chosen.contractedPaisa, invoicedPaisa: chosen.invoicedPaisa } : null;
  const overBilled = billing && subjectType !== 'OTHER' && totals.subtotal > billing.remainingPaisa;

  const save = async () => {
    if (!account?._id) return showToast('Choose who the invoice is for', 'warning');
    if (!editing && subjectType !== 'OTHER' && !subjectId) return showToast(subjectType === 'SPONSORSHIP_DEAL' ? 'Choose the deal to invoice' : 'Choose the ad campaign to invoice', 'warning');
    if (!lines.length) return showToast('Add at least one line', 'warning');
    const bad = lines.findIndex((l) => !l.description.trim() || !(Number(l.quantity) > 0) || l.unitPrice === '' || !(Number(l.unitPrice) >= 0));
    if (bad >= 0) return showToast(`Line ${bad + 1}: add a description, a quantity and a price`, 'warning');
    if (totals.subtotal <= 0) return showToast('The invoice total must be more than zero', 'warning');
    if (!isDateInput(dueDate)) return showToast('Due date must look like 2026-11-20', 'warning');
    const body = {
      lines: lines.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      dueDate: dueDate || null,
      notes: notes.trim(),
      ...(subjectType === 'OTHER' ? { source } : {}),
    };
    setBusy(true);
    try {
      const res = editing
        ? await API.put(`/revenue/invoices/${invoice._id}`, body)
        : await API.post('/revenue/invoices', {
          ...body,
          sponsorAccount: account._id,
          subjectType,
          ...(subjectType === 'SPONSORSHIP_DEAL' ? { deal: subjectId } : subjectType === 'AD_CAMPAIGN' ? { adCampaign: subjectId } : {}),
        });
      showToast(res.data?.message || 'Saved', 'success');
      onSaved?.(res.data?.data);
    } catch (err) {
      showToast(errorMessage(err, 'Could not save the invoice'), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const s = settings.data;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit draft' : 'New invoice'}
      footer={<Button title={editing ? 'Save draft' : 'Save as draft'} icon={Save} full loading={busy} onPress={save} />}
    >
      {editing ? (
        <Box>
          <T variant="caption">Bill to</T>
          <T variant="semibold">{invoice.sponsorAccount?.name}</T>
          <T variant="caption">{SUBJECTS.find((x) => x.value === invoice.subjectType)?.label}</T>
        </Box>
      ) : (
        <AccountPicker value={account} onChange={(a) => { setAccount(a); setSubjectId(''); setBillables(null); }} />
      )}

      {account && !editing ? (
        <View style={{ gap: 10 }}>
          <Select label="What is it for?" options={SUBJECTS} value={subjectType} onChange={(v) => { setSubjectType(v); setSubjectId(''); setLines([{ ...blankLine, _key: key() }]); }} />
          {subjectType === 'OTHER' ? null : billablesError ? <Notice>{billablesError}</Notice> : !billables ? <Loading /> : options.length ? (
            <View style={{ gap: 8 }}>
              {options.map((o) => <SubjectOption key={o._id} item={o} active={String(o._id) === String(subjectId)} onPress={() => pick(o)} />)}
            </View>
          ) : (
            <T variant="small">{subjectType === 'SPONSORSHIP_DEAL' ? 'This sponsor has no agreed deals to invoice.' : 'This advertiser has no approved, priced campaigns to invoice.'}</T>
          )}
        </View>
      ) : null}

      {subjectType === 'OTHER' ? (
        <Select label="Revenue stream" options={OTHER_SOURCES.map((v) => ({ value: v, label: SOURCE_LABELS[v] }))} value={source} onChange={setSource} />
      ) : null}

      {billing && subjectType !== 'OTHER' ? (
        <T variant="small" style={{ color: overBilled ? colors.brand : colors.inkSoft }}>
          {`Left to invoice: ${formatPaisa(billing.remainingPaisa)} before VAT (contracted ${formatPaisa(billing.contractedPaisa)}, already invoiced ${formatPaisa(billing.invoicedPaisa)}).`}
          {overBilled ? ' This draft is more than that — issuing it will be refused.' : ''}
        </T>
      ) : null}

      {account ? (
        <>
          <RowListEditor
            title="Lines"
            hint="Prices in NPR, before VAT."
            rows={lines}
            onChange={setLines}
            blank={blankLine}
            addLabel="Add line"
            renderRow={(row, update, i) => (
              <View style={{ gap: 8 }}>
                <Field label={`Line ${i + 1}`} value={row.description} onChangeText={(description) => update({ description })} maxLength={300} placeholder="Description" />
                <Row gap={10} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 90 }}>
                    <Field label="Qty" value={row.quantity} onChangeText={(quantity) => update({ quantity: decimalInput(quantity) })} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Unit price (NPR)" value={row.unitPrice} onChangeText={(unitPrice) => update({ unitPrice: decimalInput(unitPrice) })} keyboardType="decimal-pad" placeholder="0.00" />
                  </View>
                </Row>
                <T variant="caption" style={{ textAlign: 'right' }}>{`Amount ${formatPaisa(totals.amounts[i])}`}</T>
              </View>
            )}
          />

          <Box tone="paper">
            <T variant="semibold" style={{ fontSize: 14.5 }}>{totals.kind === 'TAX_INVOICE' ? 'Tax invoice' : 'Invoice'} totals</T>
            {settings.loading && !settings.data ? <Loading /> : (
              <>
                <Row style={{ justifyContent: 'space-between' }}><T variant="small">Subtotal</T><T variant="semibold">{formatPaisa(totals.subtotal)}</T></Row>
                {totals.kind === 'TAX_INVOICE' ? <Row style={{ justifyContent: 'space-between' }}><T variant="small">{`VAT (${totals.vatRate}%)`}</T><T variant="semibold">{formatPaisa(totals.vat)}</T></Row> : null}
                <Row style={{ justifyContent: 'space-between' }}><T variant="semibold">Total</T><T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{formatPaisa(totals.total)}</T></Row>
                <T variant="caption">{s ? (s.vatRegistered ? `VAT registered (${s.vatRate}%) — VAT is added on top of the subtotal.` : 'Not VAT registered — no VAT is added.') : settings.error || ''} Totals are recalculated with the billing profile when the invoice is issued.</T>
              </>
            )}
          </Box>

          <DateField label="Due date" value={dueDate} onChangeText={setDueDate} hint={`Leave empty for ${s?.defaultDueDays ?? 'the default number of'} days after the issue date.`} />
          <Field label="Notes on the invoice" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
        </>
      ) : null}

    </Sheet>
  );
}
