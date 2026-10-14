import React from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BriefcaseBusiness, ShieldAlert } from 'lucide-react-native';
import { useToast } from '../../../context/ToastContext';
import { EmptyState, ErrorState, Loading, Screen } from '../../../components/ui';
import AdminDealDetail, { useDeal } from '../../../components/sponsorship/AdminDealDetail';

// Staff view of one sponsorship deal (web: SuperAdminDashboard sponsorDeals → deal drawer).
// Opened from admin/sponsorDeals (also via ?deal=<id> deep links from notifications).
export default function AdminSponsorDeal() {
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  const { data: deal, setData, loading, refreshing, error, status, reload, refresh } = useDeal(id);

  const title = deal?.sponsor?.name || 'Sponsor deal';
  if (loading) return <><Stack.Screen options={{ title: 'Sponsor deal' }} /><Loading /></>;

  if (!deal) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Sponsor deal' }} />
        {status === 404 ? (
          <EmptyState icon={BriefcaseBusiness} title="Deal not found" message="It may have been removed with its campaign." action="Back to deals" onAction={() => router.replace('/admin/sponsorDeals')} />
        ) : status === 403 ? (
          <EmptyState icon={ShieldAlert} title="No access" message={error} />
        ) : (
          <ErrorState message={error} onRetry={() => reload()} />
        )}
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Stack.Screen options={{ title }} />
      <AdminDealDetail deal={deal} onDeal={setData} showToast={showToast} />
    </Screen>
  );
}
