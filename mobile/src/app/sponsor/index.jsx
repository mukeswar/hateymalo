import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { BadgeCheck, BriefcaseBusiness, Handshake, Megaphone, ReceiptText, ShieldCheck } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, space } from '../../theme';
import { Button, ChipBar, EmptyState, ErrorState, Row, Screen, Skeleton, T } from '../../components/ui';
import { CAMPAIGN_TYPES, OpportunityCard } from '../../components/sponsorship/SponsorBits';

// /sponsor — why sponsor + open sponsorship opportunities (web: /sponsor).
const WHY = [
  { icon: ShieldCheck, title: 'Your logo, only with your approval', body: 'Nothing carries your brand until you approve the exact logo for that campaign.' },
  { icon: ReceiptText, title: 'Every rupee accounted for', body: 'Payments, receipts and in-kind items are logged on your deal. In-kind values are never counted as cash.' },
  { icon: BadgeCheck, title: 'Proof you can see', body: 'Deliverables come with photos or links, and you receive an impact report when the campaign ends.' },
];

const FILTERS = [{ value: 'ALL', label: 'All campaigns' }, ...CAMPAIGN_TYPES];

export default function SponsorOpportunities() {
  const { user } = useAuth();
  const [type, setType] = useState('ALL');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const qs = type !== 'ALL' ? `&campaignType=${type}` : '';
      const res = await API.get(`/sponsorship/opportunities?status=OPEN${qs}`);
      setItems(res.data?.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load sponsorship opportunities.'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const header = (
    <View style={{ gap: space.xl, paddingBottom: space.lg }}>
      <View style={{ gap: 10, paddingHorizontal: space.lg, paddingTop: space.lg }}>
        <T variant="eyebrowDeva">प्रायोजक बन्नुहोस्</T>
        <T variant="display">Back a campaign your community can see.</T>
        <T variant="body" style={{ color: colors.muted }}>
          Fund a clean-up, a blood drive or a relief effort with cash, goods or services. You agree the terms with the Hateymalo team, approve how your logo is used and follow the results in your sponsor portal.
        </T>
        <Button
          title={user ? 'Open sponsor portal' : 'Sign in to the sponsor portal'}
          icon={BriefcaseBusiness}
          variant="pine"
          size="lg"
          full
          onPress={() => router.push(user ? '/sponsor/portal' : '/login')}
        />
      </View>

      <View style={{ gap: 12, paddingHorizontal: space.lg }}>
        {WHY.map(({ icon: Icon, title, body }) => (
          <Row key={title} gap={14} style={{ alignItems: 'flex-start', backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} color={colors.pine} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="semibold">{title}</T>
              <T variant="small">{body}</T>
            </View>
          </Row>
        ))}
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ paddingHorizontal: space.lg, gap: 4 }}>
          <T variant="eyebrowDeva">खुला अभियानहरू</T>
          <T variant="h1">Open for sponsors</T>
        </View>
        <ChipBar options={FILTERS} value={type} onChange={setType} />
      </View>
    </View>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: 'Sponsor a campaign' }} />
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(o) => o._id}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingBottom: 64 }}
        ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: space.lg }}>
            <OpportunityCard opp={item} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
              <Skeleton height={320} radius={radius.card} />
              <Skeleton height={320} radius={radius.card} />
            </View>
          ) : error ? (
            <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
          ) : (
            <EmptyState
              icon={type === 'ALL' ? Handshake : Megaphone}
              title={type === 'ALL' ? 'No campaigns are open to sponsors right now' : 'Nothing open in this category'}
              message="New campaigns are added by the Hateymalo team. Set up your sponsor account now and you'll be ready to apply when one opens."
              action={type === 'ALL' ? (user ? 'Set up a sponsor account' : 'Sign in') : 'Show all campaigns'}
              onAction={() => (type !== 'ALL' ? setType('ALL') : router.push(user ? '/sponsor/portal' : '/login'))}
            />
          )
        }
      />
    </Screen>
  );
}
