import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, Building2, Mail, MapPin, Plus } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useSettings } from '../context/SettingsContext';
import { colors, fonts, radius } from '../theme';
import { Avatar, Button, Card, Chip, Divider, EmptyState, ErrorState, Row, Screen, Skeleton, T } from '../components/ui';

// Port of frontend/src/pages/Organizations.jsx (GET /search?entityType=ORGANIZATIONS).
export default function Organizations() {
  const { settings } = useSettings();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const registrationsOn = settings?.allowRegistrations !== false;

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await API.get('/search?entityType=ORGANIZATIONS');
      if (res.data?.success) setOrgs(res.data.data?.organizations || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load organisations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrgs();
    setRefreshing(false);
  };

  if (error && !orgs.length && !loading) {
    return <Screen><ErrorState message={error} onRetry={() => { setLoading(true); fetchOrgs(); }} /></Screen>;
  }

  const header = (
    <View style={{ gap: 14, paddingBottom: 16 }}>
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">संस्थाहरू</T>
        <T variant="h1">Organisations working hand in hand</T>
        <T variant="body" style={{ color: colors.muted }}>
          NGOs, schools, clubs and community groups that organise volunteer drives and relief work through Hateymalo.
        </T>
      </View>
      {registrationsOn ? (
        <Button title="Register your organisation" icon={Plus} variant="ghost" size="sm" onPress={() => router.push('/register')} style={{ alignSelf: 'flex-start' }} />
      ) : null}
      {!loading && orgs.length > 0 ? (
        <T variant="small">{orgs.length} {orgs.length === 1 ? 'organisation' : 'organisations'}</T>
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : orgs}
        keyExtractor={(o) => o._id}
        ListHeaderComponent={header}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 14 }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} height={200} radius={radius.card} />)}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon={Building2}
                title="No organisations have joined yet"
                message="If you run an NGO, school, club or community group, you can be among the first to organise volunteers here."
                action={registrationsOn ? 'Register your organisation' : null}
                onAction={() => router.push('/register')}
              />
            </Card>
          )
        }
        renderItem={({ item: org }) => {
          const displayName = org.orgDetails?.orgName || org.name;
          const description = org.orgDetails?.description || org.bio;
          return (
            <Card onPress={() => router.push(`/profile/${org._id}`)} accessibilityLabel={`View profile of ${displayName}`} style={{ gap: 12 }}>
              <Row gap={14} style={{ alignItems: 'flex-start' }}>
                <Avatar name={displayName} src={org.profilePicture} size="lg" rounded={false} />
                <View style={{ flex: 1, gap: 6 }}>
                  <T variant="h3">{displayName}</T>
                  <Row gap={6} wrap>
                    <Chip label={org.orgDetails?.orgType || 'Organisation'} icon={Building2} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                    {org.isVerified ? (
                      <Chip label="Verified" icon={BadgeCheck} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                    ) : null}
                  </Row>
                </View>
              </Row>
              {description ? <T variant="small" numberOfLines={3} style={{ color: colors.inkSoft }}>{description}</T> : null}
              {org.location || org.email ? (
                <>
                  <Divider />
                  <View style={{ gap: 6 }}>
                    {org.location ? (
                      <Row gap={8}>
                        <MapPin size={15} color={colors.brand} />
                        <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{org.location}</T>
                      </Row>
                    ) : null}
                    {org.email ? (
                      <Row gap={8}>
                        <Mail size={15} color={colors.sky} />
                        <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{org.email}</T>
                      </Row>
                    ) : null}
                  </View>
                </>
              ) : null}
              <Row gap={6}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>View profile</T>
                <ArrowRight size={16} color={colors.ink} />
              </Row>
            </Card>
          );
        }}
      />
    </Screen>
  );
}
