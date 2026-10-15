import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FilePlus, ReceiptText, Settings2 } from 'lucide-react-native';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { space } from '../../theme';
import { Button, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { SearchBar } from '../../components/admin/content/kit';
import { StatTile, useSponsorApi } from '../../components/sponsorship/AdminSponsorKit';
import { InvoiceCard, formatPaisa, invoiceNumber, subjectLabel } from '../../components/revenue/RevenueBits';
import InvoiceEditor from '../../components/revenue/InvoiceEditor';
import BillingProfileSheet from '../../components/revenue/BillingProfileSheet';

const TITLE = findSection('invoices')?.label || 'Invoices';
const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'OPEN', label: 'Open' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];
const queryFor = (f) =>
  f === 'ALL' ? '' : f === 'OPEN' ? '?status=ISSUED,PARTIALLY_PAID' : f === 'OVERDUE' ? '?overdue=true' : `?status=${f}`;
const str = (v) => (typeof v === 'string' ? v : '');

// Web: SuperAdminDashboard "invoices" tab (canManageRevenue). GET /revenue/invoices with status /
// overdue filters; new invoice drawer; billing profile. Deep links:
// ?invoice=<id> (notifications /admin?tab=invoices&invoice=<id>) opens that invoice;
// ?filter=OVERDUE|OPEN|… preselects a filter; ?new=1&account=<id>&deal=<id>|adCampaign=<id>&sponsorName= opens the new-invoice form prefilled.
export default function AdminInvoices() {
  const params = useLocalSearchParams();
  const { showToast } = useToast();
  const [filter, setFilter] = useState(() => (FILTERS.some((f) => f.value === params.filter) ? params.filter : 'ALL'));
  const [q, setQ] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [preset, setPreset] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const list = useSponsorApi(`/revenue/invoices${queryFor(filter)}`, { fallback: 'Could not load invoices.' });
  const open = useSponsorApi('/revenue/invoices?status=ISSUED,PARTIALLY_PAID', { fallback: 'Could not load open invoices.' });

  const opened = useRef('');
  useEffect(() => {
    const id = str(params.invoice);
    if (id && opened.current !== id) {
      opened.current = id;
      router.setParams({ invoice: undefined });
      router.push(`/admin/invoice/${id}`);
    }
  }, [params.invoice]);

  useEffect(() => {
    if (str(params.new) !== '1') return;
    setPreset(str(params.account) ? { sponsorAccount: str(params.account), sponsorName: str(params.sponsorName), deal: str(params.deal), adCampaign: str(params.adCampaign) } : null);
    setEditorOpen(true);
    router.setParams({ new: undefined, account: undefined, deal: undefined, adCampaign: undefined, sponsorName: undefined });
  }, [params.new]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    list.reload();
    open.reload();
  }, [list.reload, open.reload])); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list.data || []).filter((i) => !s || [invoiceNumber(i), i.sponsorAccount?.name, subjectLabel(i)].some((x) => String(x || '').toLowerCase().includes(s)));
  }, [list.data, q]);

  const openRows = open.data || [];
  const outstanding = openRows.reduce((s, i) => s + (i.balancePaisa || 0), 0);
  const overdue = openRows.filter((i) => i.overdue);

  const onSaved = (inv) => {
    setEditorOpen(false);
    list.reload();
    if (inv?._id) router.push(`/admin/invoice/${inv._id}`);
  };

  return (
    <Screen refreshing={list.refreshing || open.refreshing} onRefresh={() => { list.refresh(); open.refresh(); }}>
      <Stack.Screen options={{ title: TITLE }} />
      <T variant="small">Invoices for sponsorship deals, ad campaigns and other income. Issued invoices are locked — fix mistakes by voiding and issuing a new one.</T>
      <Row wrap gap={10}>
        <Button title="New invoice" icon={FilePlus} size="sm" onPress={() => { setPreset(null); setEditorOpen(true); }} />
        <Button title="Billing profile" icon={Settings2} size="sm" variant="ghost" onPress={() => setProfileOpen(true)} />
      </Row>

      {open.data ? (
        <Row wrap gap={10}>
          <StatTile label="Outstanding" value={formatPaisa(outstanding)} hint={`${openRows.length} open invoice${openRows.length === 1 ? '' : 's'}`} />
          <StatTile label="Overdue" value={formatPaisa(overdue.reduce((s, i) => s + (i.balancePaisa || 0), 0))} hint={`${overdue.length} invoice${overdue.length === 1 ? '' : 's'}`} tone={overdue.length ? 'warn' : undefined} />
        </Row>
      ) : null}

      <SearchBar value={q} onChange={setQ} placeholder="Search number, sponsor or subject…" />
      <ChipBar options={FILTERS} value={filter} onChange={setFilter} style={{ paddingHorizontal: 0 }} />

      {list.loading && !list.data ? <Loading /> : list.error && !list.data ? (
        list.status === 403 ? <EmptyState icon={ReceiptText} title="No access" message={list.error} /> : <ErrorState message={list.error} onRetry={() => list.reload()} />
      ) : rows.length ? (
        <View style={{ gap: space.md }}>
          {rows.map((inv) => <InvoiceCard key={inv._id} inv={inv} href={`/admin/invoice/${inv._id}`} />)}
        </View>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title={(list.data || []).length ? 'No matches' : filter === 'ALL' ? 'No invoices yet' : 'Nothing here'}
          message={(list.data || []).length ? 'Try another search.' : filter === 'ALL' ? 'Create the first invoice for an agreed deal, an approved ad campaign or other income.' : 'No invoices with this status.'}
        />
      )}

      <InvoiceEditor visible={editorOpen} onClose={() => setEditorOpen(false)} preset={preset} onSaved={onSaved} showToast={showToast} />
      <BillingProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} onSaved={() => setProfileOpen(false)} showToast={showToast} />
    </Screen>
  );
}
