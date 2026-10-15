import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { BookOpenText, Download, Plus, Undo2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, humanize } from '../../lib/format';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, Select, Sheet, T } from '../../components/ui';
import { Box, DateField, PickChips, isDateInput, toDateInput, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { PAYMENT_METHODS, SOURCES, SOURCE_LABELS, STAGES, STAGE_LABELS, decimalInput, downloadLedgerCsv, formatPaisa, nprToPaisa } from '../../components/revenue/RevenueBits';

const TITLE = findSection('ledger')?.label || 'Revenue ledger';
const STAGE_TONES = {
  CONTRACTED: { bg: colors.skyTint, fg: colors.sky },
  INVOICED: { bg: colors.paperDeep, fg: colors.inkSoft },
  RECEIVED: { bg: colors.pineTint, fg: colors.pine },
  SPENT: { bg: colors.brandTint, fg: colors.brand },
};

const Multi = ({ label, options, labels, value, onChange }) => (
  <View style={{ gap: 8 }}>
    <T variant="semibold" style={{ fontSize: 14.5 }}>{label}</T>
    <Row wrap gap={8}>
      {options.map((o) => {
        const on = value.includes(o);
        return <Chip key={o} label={labels[o] || o} active={on} onPress={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} />;
      })}
    </Row>
  </View>
);

const LedgerRow = ({ r, onReverse }) => {
  const isReversal = !!r.reversalOf;
  const muted = isReversal || r.reversed;
  const canReverse = r.origin === 'MANUAL' && !r.reversalOf && !r.reversed;
  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand, borderRadius: radius.md, padding: space.md, gap: 4, opacity: muted ? 0.72 : 1 }}>
      <Row style={{ justifyContent: 'space-between' }} gap={8}>
        <Row gap={6} wrap style={{ flex: 1 }}>
          <Chip label={STAGE_LABELS[r.stage] || r.stage} tone={STAGE_TONES[r.stage]} style={{ paddingVertical: 2, paddingHorizontal: 9 }} />
          {isReversal ? <Chip label="Reversal" tone={{ bg: colors.paperDeep, fg: colors.muted }} style={{ paddingVertical: 2, paddingHorizontal: 9 }} /> : null}
          {r.reversed ? <Chip label="Reversed" tone={{ bg: colors.paperDeep, fg: colors.muted }} style={{ paddingVertical: 2, paddingHorizontal: 9 }} /> : null}
        </Row>
        <T variant="caption">{formatDate(r.date)}</T>
      </Row>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} gap={10}>
        <T variant="body" style={{ flex: 1, color: muted ? colors.muted : colors.ink }}>{r.description}</T>
        <T style={{ fontFamily: fonts.bold, fontSize: 15, color: muted ? colors.muted : r.amountPaisa < 0 ? colors.brand : colors.ink }}>{formatPaisa(r.amountPaisa)}</T>
      </Row>
      <T variant="caption">
        {[SOURCE_LABELS[r.source] || r.source, r.sponsorAccount?.name, r.invoice?.number, r.method ? humanize(r.method) : null, r.reference, r.vatPaisa ? `VAT ${formatPaisa(r.vatPaisa)}` : null].filter(Boolean).join(' · ')}
      </T>
      {r.note ? <T variant="small" style={{ color: colors.muted }}>{isReversal ? `Reason: ${r.note}` : r.note}</T> : null}
      <Row style={{ justifyContent: 'space-between' }} gap={8}>
        <T variant="caption">{`${r.origin === 'MANUAL' ? 'Manual' : 'System'}${r.createdBy?.name ? ` · ${r.createdBy.name}` : ''}`}</T>
        {canReverse ? <Button title="Reverse" icon={Undo2} size="sm" variant="text" onPress={() => onReverse(r)} /> : null}
      </Row>
    </View>
  );
};

const blankEntry = () => ({ date: toDateInput(new Date()), stage: 'SPENT', source: 'OTHER', amount: '', description: '', method: 'BANK_TRANSFER', reference: '', note: '' });

const EntrySheet = ({ visible, onClose, onSaved, showToast }) => {
  const [f, setF] = useState(blankEntry());
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const sources = f.stage === 'RECEIVED' ? SOURCES.filter((s) => !['SPONSORSHIP', 'ADVERTISING'].includes(s)) : SOURCES;
  const save = async () => {
    if (nprToPaisa(f.amount) < 100) return showToast('Amount must be at least Rs. 1', 'warning');
    if (!f.description.trim()) return showToast('Describe the entry', 'warning');
    if (!isDateInput(f.date)) return showToast('Date must look like 2026-11-20', 'warning');
    if (f.stage === 'RECEIVED' && f.method !== 'CASH' && !f.reference.trim()) return showToast('Add the bank or transaction reference', 'warning');
    setBusy(true);
    try {
      const res = await API.post('/revenue/ledger', { date: f.date || undefined, stage: f.stage, source: f.source, amount: Number(f.amount), description: f.description.trim(), method: f.method, reference: f.reference.trim(), note: f.note.trim() });
      showToast(res.data?.message || 'Entry added', 'success');
      setF(blankEntry());
      onSaved();
    } catch (err) {
      showToast(errorMessage(err, 'Could not add the entry'), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Add ledger entry" footer={<Button title="Add entry" icon={Plus} full loading={busy} onPress={save} />}>
      <T variant="small">For other income and costs. Sponsorship and ad payments are recorded on the deal or invoice, so they are never counted twice.</T>
      <Select label="Type" options={[{ value: 'RECEIVED', label: 'Money received' }, { value: 'SPENT', label: 'Money spent' }]} value={f.stage} onChange={(stage) => setF((x) => ({ ...x, stage, source: stage === 'RECEIVED' && ['SPONSORSHIP', 'ADVERTISING'].includes(x.source) ? 'OTHER' : x.source }))} />
      <Select label="Revenue stream" options={sources.map((s) => ({ value: s, label: SOURCE_LABELS[s] }))} value={f.source} onChange={set('source')} />
      <Field label="Amount (NPR)" value={f.amount} onChangeText={(v) => set('amount')(decimalInput(v))} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label="Description" value={f.description} onChangeText={set('description')} maxLength={300} />
      <DateField label="Date" value={f.date} onChangeText={set('date')} />
      <PickChips label="Method" options={PAYMENT_METHODS} value={f.method} onChange={set('method')} />
      <Field label={f.stage === 'RECEIVED' && f.method !== 'CASH' ? 'Bank / transaction reference' : 'Reference (optional)'} value={f.reference} onChangeText={set('reference')} maxLength={120} autoCapitalize="characters" />
      <Field label="Note" value={f.note} onChangeText={set('note')} maxLength={500} multiline />
    </Sheet>
  );
};

const ReverseSheet = ({ entry, onClose, onDone, showToast }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!reason.trim()) return showToast('Give a reason for the reversal', 'warning');
    setBusy(true);
    try {
      const res = await API.delete(`/revenue/ledger/${entry._id}`, { params: { reason: reason.trim() } });
      showToast(res.data?.message || 'Entry reversed', 'success');
      setReason('');
      onDone();
    } catch (err) {
      showToast(errorMessage(err, 'Could not reverse the entry'), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };
  return (
    <Sheet visible={!!entry} onClose={onClose} title="Reverse entry" footer={<Button title="Post reversal" icon={Undo2} variant="danger" full loading={busy} onPress={go} />}>
      {entry ? (
        <Box tone="paper">
          <T variant="semibold">{entry.description}</T>
          <T variant="small">{`${STAGE_LABELS[entry.stage]} · ${formatPaisa(entry.amountPaisa)} · ${formatDate(entry.date)}`}</T>
        </Box>
      ) : null}
      <T variant="small">Ledger rows are never edited. A reversal row with the opposite amount is posted and this row is marked reversed.</T>
      <Field label="Reason" value={reason} onChangeText={setReason} maxLength={300} multiline />
    </Sheet>
  );
};

// Web: SuperAdminDashboard "ledger" tab (canManageRevenue). GET /revenue/ledger?from=&to=&stage=&source=
// (newest first, max 1000), CSV export, manual entries (POST) and reversals (DELETE ?reason=).
export default function AdminLedger() {
  const { showToast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [applied, setApplied] = useState({});
  const [adding, setAdding] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const query = useMemo(() => {
    const p = Object.entries(applied).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return p ? `?${p}` : '';
  }, [applied]);
  const list = useSponsorApi(`/revenue/ledger${query}`, { fallback: 'Could not load the ledger.' });

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    list.reload();
  }, [list.reload])); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = () => {
    if (!isDateInput(from) || !isDateInput(to)) return showToast('Use the format YYYY-MM-DD', 'warning');
    setApplied({ from, to, stage: stages.join(','), source: sources.join(',') });
    return undefined;
  };
  const clear = () => { setFrom(''); setTo(''); setStages([]); setSources([]); setApplied({}); };
  const filtered = Object.values(applied).some(Boolean);
  const rows = list.data || [];

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.md }}>
      <T variant="small">Every money event, newest first. Rows are never edited — corrections are reversal rows. System rows follow their deal, campaign or invoice.</T>
      <Row wrap gap={10}>
        <Button title="Add entry" icon={Plus} size="sm" onPress={() => setAdding(true)} />
        <Button title="CSV" icon={Download} size="sm" variant="ghost" loading={exporting} onPress={async () => { setExporting(true); await downloadLedgerCsv(applied, showToast); setExporting(false); }} />
      </Row>
      <Box>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><DateField label="From" value={from} onChangeText={setFrom} /></View>
          <View style={{ flex: 1 }}><DateField label="To" value={to} onChangeText={setTo} /></View>
        </Row>
        <Multi label="Stage" options={STAGES} labels={STAGE_LABELS} value={stages} onChange={setStages} />
        <Multi label="Revenue stream" options={SOURCES} labels={SOURCE_LABELS} value={sources} onChange={setSources} />
        <Row gap={8}>
          <Button title="Apply filters" size="sm" variant="soft" onPress={apply} />
          {filtered ? <Button title="Clear" size="sm" variant="text" onPress={clear} /> : null}
        </Row>
      </Box>
      {list.data ? <T variant="caption">{`${rows.length} row${rows.length === 1 ? '' : 's'}${rows.length >= 1000 ? ' (showing the newest 1,000 — narrow the dates or use CSV)' : ''}`}</T> : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: TITLE }} />
      {list.loading && !list.data ? <Loading /> : list.error && !list.data ? (
        list.status === 403 ? <EmptyState icon={BookOpenText} title="No access" message={list.error} /> : <ErrorState message={list.error} onRetry={() => list.reload()} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r._id}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 64 }}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <LedgerRow r={item} onReverse={setReversing} />}
          ListEmptyComponent={<EmptyState icon={BookOpenText} title={filtered ? 'No rows match' : 'The ledger is empty'} message={filtered ? 'Try wider dates or fewer filters.' : 'Rows appear as deals are agreed, ads approved, invoices issued and money received or spent.'} />}
        />
      )}
      <EntrySheet visible={adding} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(); }} showToast={showToast} />
      <ReverseSheet entry={reversing} onClose={() => setReversing(null)} onDone={() => { setReversing(null); list.reload(); }} showToast={showToast} />
    </Screen>
  );
}
