import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { space } from '../../../theme';
import { ChipBar, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../../components/ui';
import { StatTile } from '../../../components/sponsorship/AdminSponsorKit';
import { EmptyInvoices, InvoiceCard, OPEN_STATUSES, formatPaisa } from '../../../components/revenue/RevenueBits';

// /sponsor/invoices — issued invoices of my sponsor accounts (web: /sponsor/invoices).
// GET /revenue/invoices/mine never returns drafts.
const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'To pay' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
];

export default function SponsorInvoices() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/revenue/invoices/mine');
      setList(res.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load your invoices.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const rows = useMemo(
    () => list.filter((i) => filter === 'ALL' || (filter === 'OPEN' ? OPEN_STATUSES.includes(i.status) : i.status === filter)),
    [list, filter]
  );
  const open = list.filter((i) => OPEN_STATUSES.includes(i.status));
  const due = open.reduce((s, i) => s + (i.balancePaisa || 0), 0);
  const overdue = open.filter((i) => i.overdue);

  if (authLoading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Invoices' }} />
        <EmptyState icon={LogIn} title="Sign in to see your invoices" message="Invoices for your sponsorships and ads appear here once they are issued." action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Stack.Screen options={{ title: 'Invoices' }} />
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">बिल</T>
        <T variant="h1">Invoices</T>
        <T variant="small">Invoices issued to the sponsor accounts you belong to, with what is paid and what is still due.</T>
      </View>

      {loading ? <Loading /> : error && !list.length ? <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} /> : (
        <>
          {list.length ? (
            <Row wrap gap={10}>
              <StatTile label="Balance due" value={formatPaisa(due)} hint={`${open.length} open invoice${open.length === 1 ? '' : 's'}`} tone={due > 0 ? undefined : 'pine'} />
              <StatTile label="Overdue" value={String(overdue.length)} hint={overdue.length ? formatPaisa(overdue.reduce((s, i) => s + (i.balancePaisa || 0), 0)) : 'Nothing overdue'} tone={overdue.length ? 'warn' : undefined} />
            </Row>
          ) : null}
          {list.length ? <ChipBar options={FILTERS} value={filter} onChange={setFilter} style={{ paddingHorizontal: 0 }} /> : null}
          {rows.length ? (
            <View style={{ gap: space.md }}>
              {rows.map((inv) => <InvoiceCard key={inv._id} inv={inv} href={`/sponsor/invoices/${inv._id}`} />)}
            </View>
          ) : (
            <EmptyInvoices message={list.length ? 'No invoices with this status.' : 'No invoices yet. When Hateymalo bills one of your sponsor accounts, the invoice appears here and you get a notification.'} />
          )}
        </>
      )}
    </Screen>
  );
}
