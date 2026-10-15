import React from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { EmptyState, Loading, Screen } from '../../../components/ui';
import CampaignDetail from '../../../components/ads/CampaignDetail';

// /sponsor/ads/[id] — advertiser view of one ad campaign (web: /sponsor/ads/:id; notification links
// /sponsor/ads/:id open here): status, actions, edit form, report and history.
export default function SponsorAdCampaign() {
  const { id } = useLocalSearchParams();
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  if (loading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Ad campaign' }} />
        <EmptyState icon={LogIn} title="Sign in to see this campaign" action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }
  return <CampaignDetail id={typeof id === 'string' ? id : ''} mode="advertiser" showToast={showToast} />;
}
