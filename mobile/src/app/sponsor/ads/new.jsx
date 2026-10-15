import React from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { EmptyState, Loading, Screen, T } from '../../../components/ui';
import CampaignEditor from '../../../components/ads/CampaignEditor';

// /sponsor/ads/new — create a draft ad campaign (web: /sponsor/ads/new). ?advertiser=<accountId> preselects the account.
export default function NewAdCampaign() {
  const { user, loading, can } = useAuth();
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const isManager = can('canManageAds');

  if (loading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'New ad campaign' }} />
        <EmptyState icon={LogIn} title="Sign in to advertise" action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'New ad campaign' }} />
      <View style={{ gap: 6 }}>
        <T variant="h1">New ad campaign</T>
        <T variant="small">Save a draft first; you can submit it for review from the campaign page.</T>
      </View>
      <CampaignEditor
        showToast={showToast}
        isManager={isManager}
        accountsPath={isManager ? '/sponsorship/admin/accounts?status=VERIFIED' : null}
        initialAdvertiser={typeof params.advertiser === 'string' ? params.advertiser : ''}
        onCancel={() => (router.canGoBack() ? router.back() : router.replace('/sponsor/ads'))}
        onSaved={(c) => c?._id && router.replace(`/sponsor/ads/${c._id}`)}
      />
    </Screen>
  );
}
