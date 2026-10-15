import React from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LogIn, ReceiptText, Share2 } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../../components/ui';
import { Section, useSponsorApi } from '../../../components/sponsorship/AdminSponsorKit';
import { InvoiceDocument, InvoiceStatusChip, OverdueChip, PaymentsList, shareInvoice, subjectLabel } from '../../../components/revenue/RevenueBits';

// /sponsor/invoices/[id] — one issued invoice for members of the billed sponsor account
// (web: /sponsor/invoices/:id with print). GET /revenue/invoices/:id (404 for drafts / other accounts).
// The app shows the same printable layout and offers Share (text summary) instead of print.
export default function SponsorInvoice() {
  const { id } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const invoiceId = typeof id === 'string' && user ? id : '';
  const { data: inv, loading, refreshing, error, status, reload, refresh } = useSponsorApi(invoiceId ? `/revenue/invoices/${invoiceId}` : null, { fallback: 'Could not load this invoice.' });

  if (authLoading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Invoice' }} />
        <EmptyState icon={LogIn} title="Sign in to see this invoice" action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }
  if (loading) return <><Stack.Screen options={{ title: 'Invoice' }} /><Loading /></>;
  if (!inv) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Invoice' }} />
        {status === 404 ? (
          <EmptyState icon={ReceiptText} title="Invoice not found" message="It may belong to an account you are not a member of." action="My invoices" onAction={() => router.replace('/sponsor/invoices')} />
        ) : (
          <ErrorState message={error} onRetry={() => reload()} />
        )}
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title: inv.number || 'Invoice' }} />
      <View style={{ gap: 6 }}>
        <Row wrap gap={6}>
          <InvoiceStatusChip status={inv.status} />
          {inv.overdue ? <OverdueChip /> : null}
        </Row>
        <T variant="small">{[inv.sponsorAccount?.name, subjectLabel(inv)].filter(Boolean).join(' · ')}</T>
        <Row gap={8}>
          <Button title="Share" icon={Share2} size="sm" variant="ghost" onPress={() => shareInvoice(inv, showToast)} />
        </Row>
      </View>
      <InvoiceDocument inv={inv} />
      {inv.status === 'VOID' ? (
        <T variant="small">This invoice was cancelled and does not need to be paid.</T>
      ) : (
        <Section title="Payments received">
          <PaymentsList payments={inv.payments} />
        </Section>
      )}
    </Screen>
  );
}
