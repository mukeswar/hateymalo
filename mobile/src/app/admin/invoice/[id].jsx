import React, { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ban, ExternalLink, Pencil, Plus, ReceiptText, Send, Share2, ShieldAlert, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { confirm } from '../../../lib/confirm';
import { useToast } from '../../../context/ToastContext';
import { formatDateTime } from '../../../lib/format';
import { colors, space } from '../../../theme';
import { Button, EmptyState, ErrorState, Field, Loading, Row, Screen, T } from '../../../components/ui';
import { Box, DateField, KV, Notice, PickChips, Section, isDateInput, toDateInput, useSponsorApi } from '../../../components/sponsorship/AdminSponsorKit';
import {
  OPEN_STATUSES,
  PAYMENT_METHODS,
  InvoiceDocument,
  InvoiceStatusChip,
  OverdueChip,
  PaymentsList,
  decimalInput,
  formatPaisa,
  invoiceNumber,
  nprToPaisa,
  paisaToInput,
  shareInvoice,
  subjectLabel,
} from '../../../components/revenue/RevenueBits';
import InvoiceEditor from '../../../components/revenue/InvoiceEditor';

// One invoice for finance staff (web: invoices tab → invoice detail).
// Draft: edit, delete, issue. Issued: record payments, remove payments (reason), void (reason).
// Opened from admin/invoices, the deal / ad campaign screens and /admin?tab=invoices&invoice=<id>.
const PaymentForm = ({ inv, onInvoice, showToast }) => {
  const [f, setF] = useState({ amount: paisaToInput(inv.balancePaisa), method: 'BANK_TRANSFER', reference: '', receivedAt: toDateInput(new Date()), note: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const record = async () => {
    const paisa = nprToPaisa(f.amount);
    if (paisa < 100) return showToast('Amount must be at least Rs. 1', 'warning');
    if (paisa > inv.balancePaisa) return showToast(`That is more than the ${formatPaisa(inv.balancePaisa)} still due`, 'warning');
    if (f.method !== 'CASH' && !f.reference.trim()) return showToast('Add the bank or transaction reference', 'warning');
    if (!isDateInput(f.receivedAt)) return showToast('Received date must look like 2026-11-20', 'warning');
    setBusy(true);
    try {
      const res = await API.post(`/revenue/invoices/${inv._id}/payments`, { amount: Number(f.amount), method: f.method, reference: f.reference.trim(), receivedAt: f.receivedAt || undefined, note: f.note.trim() });
      onInvoice(res.data.data);
      setF((x) => ({ ...x, amount: paisaToInput(res.data.data?.balancePaisa), reference: '', note: '' }));
      showToast(res.data?.message || 'Payment recorded', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Could not record the payment'), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };
  return (
    <Box tone="paper">
      <T variant="semibold">Record a payment</T>
      <Field label="Amount (NPR)" value={f.amount} onChangeText={(v) => set('amount')(decimalInput(v))} keyboardType="decimal-pad" hint={`Balance due ${formatPaisa(inv.balancePaisa)}`} />
      <PickChips label="Method" options={PAYMENT_METHODS} value={f.method} onChange={set('method')} />
      <Field label={f.method === 'CASH' ? 'Reference (optional)' : 'Bank / transaction reference'} value={f.reference} onChangeText={set('reference')} maxLength={120} autoCapitalize="characters" />
      <DateField label="Received on" value={f.receivedAt} onChangeText={set('receivedAt')} />
      <Field label="Note" value={f.note} onChangeText={set('note')} maxLength={300} />
      <Button title="Record payment" icon={Plus} variant="pine" loading={busy} onPress={record} />
    </Box>
  );
};

export default function AdminInvoice() {
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  const invoiceId = typeof id === 'string' ? id : '';
  const { data: inv, setData, loading, refreshing, error, status, reload, refresh } = useSponsorApi(invoiceId ? `/revenue/invoices/${invoiceId}` : null, { fallback: 'Could not load this invoice.' });
  const [busy, setBusy] = useState('');
  const [editing, setEditing] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [deleteBlocked, setDeleteBlocked] = useState('');

  if (loading) return <><Stack.Screen options={{ title: 'Invoice' }} /><Loading /></>;
  if (!inv) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Invoice' }} />
        {status === 404 ? (
          <EmptyState icon={ReceiptText} title="Invoice not found" message="It may have been a draft that was deleted." action="All invoices" onAction={() => router.replace('/admin/invoices')} />
        ) : status === 403 ? (
          <EmptyState icon={ShieldAlert} title="No access" message={error} />
        ) : (
          <ErrorState message={error} onRetry={() => reload()} />
        )}
      </Screen>
    );
  }

  const run = async (name, fn, fallback) => {
    setBusy(name);
    try {
      const res = await fn();
      if (res.data?.data) setData(res.data.data);
      showToast(res.data?.message || 'Done', 'success');
      reload(); // the full GET adds the billing position and who recorded each payment
      return res;
    } catch (err) {
      showToast(errorMessage(err, fallback), 'error');
      return err;
    } finally {
      setBusy('');
    }
  };

  const issue = async () => {
    if (!isDateInput(issueDate)) return showToast('Issue date must look like 2026-11-20', 'warning');
    const ok = await confirm(
      `Issue invoice for ${formatPaisa(inv.totalPaisa)}?`,
      'It gets the next invoice number and is locked: it can no longer be edited, only voided. The sponsor is notified and can see it in their portal.',
      { confirmText: 'Issue', destructive: false }
    );
    if (!ok) return undefined;
    await run('issue', () => API.post(`/revenue/invoices/${inv._id}/issue`, issueDate ? { issueDate } : {}), 'Could not issue the invoice');
    return undefined;
  };

  const remove = async () => {
    if (!(await confirm('Delete this draft?', 'Drafts have no number yet, so nothing is kept.', { confirmText: 'Delete' }))) return;
    setBusy('delete');
    try {
      const res = await API.delete(`/revenue/invoices/${inv._id}`);
      showToast(res.data?.message || 'Draft deleted', 'success');
      router.replace('/admin/invoices');
    } catch (err) {
      if (err?.response?.status === 409) setDeleteBlocked(errorMessage(err, 'Issued invoices cannot be deleted. Void it instead.'));
      showToast(errorMessage(err, 'Could not delete the draft'), 'error');
      reload();
    } finally {
      setBusy('');
    }
  };

  const doVoid = async () => {
    if (!voidReason.trim()) return showToast('Give a reason for voiding', 'warning');
    if (!(await confirm(`Void ${invoiceNumber(inv)}?`, `It keeps its number and is marked VOID. Its ledger rows are reversed and the sponsor is told.\n\nReason: ${voidReason.trim()}`, { confirmText: 'Void' }))) return undefined;
    const res = await run('void', () => API.post(`/revenue/invoices/${inv._id}/void`, { reason: voidReason.trim() }), 'Could not void the invoice');
    if (res?.data?.success) setVoidReason('');
    return undefined;
  };

  const removePayment = async (p) => {
    if (!removeReason.trim()) return showToast('Write the reason for removing the payment first', 'warning');
    if (!(await confirm(`Remove ${formatPaisa(p.amountPaisa)} payment?`, `Its ledger row is reversed.\n\nReason: ${removeReason.trim()}`, { confirmText: 'Remove' }))) return undefined;
    const res = await run(p._id, () => API.delete(`/revenue/invoices/${inv._id}/payments/${p._id}`, { params: { reason: removeReason.trim() } }), 'Could not remove the payment');
    if (res?.data?.success) setRemoveReason('');
    return undefined;
  };

  const isDraft = inv.status === 'DRAFT';
  const isOpen = OPEN_STATUSES.includes(inv.status);
  const canVoid = !isDraft && inv.status !== 'VOID';
  const payments = inv.payments || [];
  const dealId = inv.deal?._id || inv.deal;
  const adId = inv.adCampaign?._id || inv.adCampaign;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: inv.number || 'Draft invoice' }} />
      <View style={{ gap: 6 }}>
        <Row wrap gap={6}>
          <InvoiceStatusChip status={inv.status} />
          {inv.overdue ? <OverdueChip /> : null}
        </Row>
        <T variant="h2">{inv.sponsorAccount?.name || 'Invoice'}</T>
        <T variant="small">{subjectLabel(inv)}</T>
        <Row wrap gap={8}>
          {dealId ? <Button title="Open deal" icon={ExternalLink} size="sm" variant="text" onPress={() => router.push(`/admin/sponsor-deal/${dealId}`)} /> : null}
          {adId ? <Button title="Open ad campaign" icon={ExternalLink} size="sm" variant="text" onPress={() => router.push(`/admin/ad-campaign/${adId}`)} /> : null}
          <Button title="Share" icon={Share2} size="sm" variant="ghost" onPress={() => shareInvoice(inv, showToast)} />
        </Row>
      </View>

      {isDraft ? (
        <Section title="Draft" hint="Not visible to the sponsor until it is issued.">
          <Row gap={8}>
            <Button title="Edit" icon={Pencil} variant="ghost" onPress={() => setEditing(true)} style={{ flex: 1 }} />
            <Button title="Delete" icon={Trash2} variant="danger" loading={busy === 'delete'} onPress={remove} style={{ flex: 1 }} />
          </Row>
          {deleteBlocked ? <Notice>{deleteBlocked}</Notice> : null}
          <DateField label="Issue date (optional)" value={issueDate} onChangeText={setIssueDate} hint="Leave empty to issue today." />
          <Button title="Issue invoice" icon={Send} variant="pine" loading={busy === 'issue'} onPress={issue} />
        </Section>
      ) : null}

      {inv.billing ? (
        <Section title="Billing position" hint="What was agreed for this deal or campaign, and how much is already invoiced (before VAT).">
          <Box>
            <KV label="Contracted" value={formatPaisa(inv.billing.contractedPaisa)} />
            <KV label="Invoiced (issued)" value={formatPaisa(inv.billing.invoicedPaisa)} />
            <KV label="Left to invoice" value={formatPaisa(inv.billing.remainingPaisa)} strong />
          </Box>
        </Section>
      ) : null}

      <Section title={isDraft ? 'Preview' : 'Invoice'}>
        <InvoiceDocument inv={inv} />
      </Section>

      {!isDraft ? (
        <Section title="Payments" hint={inv.status === 'VOID' ? undefined : `Paid ${formatPaisa(inv.paidPaisa)} of ${formatPaisa(inv.totalPaisa)}`}>
          <PaymentsList
            payments={payments}
            renderAction={inv.status === 'VOID' ? null : (p) => <Button title="Remove" icon={Trash2} variant="danger" size="sm" loading={busy === p._id} onPress={() => removePayment(p)} />}
          />
          {payments.length && inv.status !== 'VOID' ? <Field label="Reason for removing a payment" value={removeReason} onChangeText={setRemoveReason} maxLength={300} hint="Required. Kept in the audit log and on the ledger reversal." /> : null}
          {isOpen ? <PaymentForm key={`${inv._id}-${inv.paidPaisa}`} inv={inv} onInvoice={(d) => { setData(d); reload(); }} showToast={showToast} /> : null}
        </Section>
      ) : null}

      {canVoid ? (
        <Section title="Void" hint="Use this to cancel a wrong invoice; issue a new one afterwards.">
          {payments.length ? (
            <Notice>Remove the recorded payments first; an invoice with payments cannot be voided.</Notice>
          ) : (
            <>
              <Field label="Reason" value={voidReason} onChangeText={setVoidReason} maxLength={500} multiline />
              <Button title="Void invoice" icon={Ban} variant="danger" loading={busy === 'void'} onPress={doVoid} />
            </>
          )}
        </Section>
      ) : null}

      {inv.status === 'VOID' && inv.voidedAt ? <T variant="caption">{`Voided ${formatDateTime(inv.voidedAt)}`}</T> : null}
      <T variant="caption" style={{ color: colors.muted, marginBottom: space.lg }}>{`Created ${formatDateTime(inv.createdAt)} · updated ${formatDateTime(inv.updatedAt)}`}</T>

      {isDraft ? (
        <InvoiceEditor
          visible={editing}
          onClose={() => setEditing(false)}
          invoice={inv}
          onSaved={(fresh) => { setEditing(false); if (fresh) setData({ ...fresh, billing: fresh.billing || inv.billing }); reload(); }}
          showToast={showToast}
        />
      ) : null}
    </Screen>
  );
}
