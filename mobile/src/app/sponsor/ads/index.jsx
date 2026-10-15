import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { LogIn, Megaphone, Plus } from 'lucide-react-native';
import API, { errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { colors, radius } from '../../../theme';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, Skeleton, T } from '../../../components/ui';
import { CampaignCard } from '../../../components/ads/AdBits';

// /sponsor/ads — my sponsor accounts' ad campaigns (web: /sponsor/ads). GET /ads/campaigns/mine.
const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Running' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DONE', label: 'Ended' },
];
const matches = (c, f) => {
  if (f === 'ALL') return c.status !== 'ARCHIVED';
  if (f === 'ACTIVE') return ['APPROVED', 'PAUSED'].includes(c.status);
  if (f === 'DONE') return ['ENDED', 'ARCHIVED'].includes(c.status);
  return c.status === f;
};

export default function MyAdCampaigns() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/ads/campaigns/mine');
      setList(res.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load your ad campaigns.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (authLoading) return <Screen><Loading /></Screen>;
  if (!user) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Advertising' }} />
        <EmptyState icon={LogIn} title="Sign in to advertise" message="Run sponsored cards and banners on Hateymalo under your sponsor account." action="Sign in" onAction={() => router.push('/login')} />
      </Screen>
    );
  }

  const shown = list.filter((c) => matches(c, filter));

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}>
      <Stack.Screen options={{ title: 'Advertising' }} />
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">विज्ञापन</T>
        <T variant="h1">Your ad campaigns</T>
        <T variant="small">Sponsored cards, banners and videos on the website and the app. Every ad is reviewed before it runs and is always labelled as sponsored.</T>
      </View>
      <Row gap={10}>
        <Button title="New campaign" icon={Plus} onPress={() => router.push('/sponsor/ads/new')} />
        <Button title="Sponsor portal" variant="ghost" onPress={() => router.push('/sponsor/portal')} />
      </Row>

      {loading ? (
        <>
          <Skeleton height={150} radius={radius.card} />
          <Skeleton height={150} radius={radius.card} />
        </>
      ) : error && !list.length ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : !list.length ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={24} color={colors.brand} />
          </View>
          <T variant="h3" style={{ textAlign: 'center' }}>No ad campaigns yet</T>
          <T variant="small" style={{ textAlign: 'center' }}>Create a draft, add your creatives and submit it for review.</T>
          <Button title="Create a campaign" icon={Plus} onPress={() => router.push('/sponsor/ads/new')} />
        </Card>
      ) : (
        <>
          <ChipBar options={FILTERS} value={filter} onChange={setFilter} style={{ paddingHorizontal: 0 }} />
          {shown.length ? shown.map((c) => <CampaignCard key={c._id} c={c} href={`/sponsor/ads/${c._id}`} />) : (
            <EmptyState icon={Megaphone} title="Nothing here" message="No campaigns match this filter." action="Show all" onAction={() => setFilter('ALL')} />
          )}
        </>
      )}
    </Screen>
  );
}
