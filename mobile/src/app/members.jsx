import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, MapPin, RotateCcw, Search, Shield, SlidersHorizontal, Users } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { colors, radius, shadow } from '../theme';
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Field, Row, Screen, Skeleton, T } from '../components/ui';

// Port of frontend/src/pages/Members.jsx (public GET /api/auth/members).
const LEVELS = {
  'NEW MEMBER': { label: 'New member', tone: { bg: colors.paperDeep, fg: colors.inkSoft } },
  'TRUSTED MEMBER': { label: 'Trusted member', tone: { bg: colors.skyTint, fg: colors.sky } },
  'VERIFIED MEMBER': { label: 'Verified member', tone: { bg: colors.pineTint, fg: colors.pine } },
  ORGANIZATION: { label: 'Organisation', tone: { bg: colors.skyTint, fg: colors.sky } },
  ADMIN: { label: 'Admin', tone: { bg: colors.brandTint, fg: colors.brand } },
};

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];
const has = (v, q) => String(v || '').toLowerCase().includes(q.toLowerCase());

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(false);

  const [searchName, setSearchName] = useState('');
  const [searchSkill, setSearchSkill] = useState('');
  const [searchInterest, setSearchInterest] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const fetchMembers = useCallback(async () => {
    try {
      const res = await API.get('/auth/members');
      if (res.data?.success) setMembers(res.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load members.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMembers();
    setRefreshing(false);
  };

  const filteredMembers = useMemo(
    () =>
      members.filter((m) => {
        const nameMatch = !searchName || has(m.name, searchName);
        const locationMatch = !searchLocation || has(m.location, searchLocation);
        const skillMatch = !searchSkill || (m.skills || []).some((s) => has(s, searchSkill));
        const interestMatch = !searchInterest || (m.interests || []).some((i) => has(i, searchInterest));
        return nameMatch && locationMatch && skillMatch && interestMatch;
      }),
    [members, searchName, searchSkill, searchInterest, searchLocation]
  );

  const handleClearFilters = () => {
    setSearchName('');
    setSearchSkill('');
    setSearchInterest('');
    setSearchLocation('');
  };

  const hasFilters = !!(searchName || searchSkill || searchInterest || searchLocation);

  const header = (
    <View style={{ gap: 16, paddingBottom: 16 }}>
      <View style={{ gap: 6 }}>
        <T variant="eyebrowDeva">समुदायका सदस्यहरू</T>
        <T variant="h1">The people behind the help</T>
        <T variant="body" style={{ color: colors.muted }}>
          Find neighbours and volunteers by name, skill, interest or place, and reach out to work on something together.
        </T>
      </View>

      <Card style={{ gap: 12 }}>
        <Field
          value={searchName}
          onChangeText={setSearchName}
          placeholder="Search by name"
          accessibilityLabel="Name"
          returnKeyType="search"
          right={<Search size={16} color={colors.muted} />}
        />
        {showMore ? (
          <>
            <Field label="Skill" value={searchSkill} onChangeText={setSearchSkill} placeholder="e.g. Teaching" />
            <Field label="Interest" value={searchInterest} onChangeText={setSearchInterest} placeholder="e.g. Plantation" />
            <Field
              label="Location"
              value={searchLocation}
              onChangeText={setSearchLocation}
              placeholder="e.g. Lalitpur"
              right={<MapPin size={16} color={colors.muted} />}
            />
          </>
        ) : null}
        <Row gap={8}>
          <Button
            title={showMore ? 'Fewer filters' : 'Skill, interest, place'}
            icon={SlidersHorizontal}
            variant="soft"
            size="sm"
            onPress={() => setShowMore((s) => !s)}
          />
          <Button title="Reset" icon={RotateCcw} variant="ghost" size="sm" disabled={!hasFilters} onPress={handleClearFilters} />
        </Row>
      </Card>

      <T variant="small" accessibilityLiveRegion="polite">
        {loading ? 'Loading members…' : `Showing ${filteredMembers.length} of ${members.length} members`}
      </T>
    </View>
  );

  if (error && !members.length && !loading) {
    return <Screen><ErrorState message={error} onRetry={() => { setLoading(true); fetchMembers(); }} /></Screen>;
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : filteredMembers}
        keyExtractor={(m) => m._id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} height={150} radius={radius.card} />)}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon={Users}
                title={members.length === 0 ? 'No members to show yet' : 'No one matches those filters'}
                message={members.length === 0 ? 'Join and be one of the first people here.' : 'Try a broader skill or a nearby place.'}
                action={members.length === 0 ? 'Join Hateymalo' : 'Clear filters'}
                onAction={members.length === 0 ? () => router.push('/register') : handleClearFilters}
              />
            </Card>
          )
        }
        renderItem={({ item: m }) => <MemberCard member={m} />}
      />
    </Screen>
  );
}

const MemberCard = ({ member }) => {
  const isStaff = STAFF.includes(member.role);
  const level = LEVELS[member.memberLevel];
  return (
    <Card onPress={() => router.push(`/profile/${member._id}`)} accessibilityLabel={`View profile of ${member.name}`} style={{ gap: 10 }}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <View>
          <Avatar name={member.name} src={member.profilePicture} size="lg" rounded={false} />
          {isStaff ? (
            <View
              accessibilityLabel="Platform team"
              style={{
                position: 'absolute',
                right: -6,
                bottom: -6,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.sand,
                alignItems: 'center',
                justifyContent: 'center',
                ...shadow.soft,
              }}
            >
              <Shield size={13} color={colors.brand} />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={6}>
            <T variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{member.name}</T>
            {member.isVerified ? <BadgeCheck size={17} color={colors.pine} accessibilityLabel="Verified" /> : null}
          </Row>
          {level ? <Chip label={level.label} tone={level.tone} style={{ paddingVertical: 2, paddingHorizontal: 10 }} /> : null}
          {member.location ? (
            <Row gap={4}>
              <MapPin size={13} color={colors.muted} />
              <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{member.location}</T>
            </Row>
          ) : null}
        </View>
        <ArrowRight size={18} color={colors.muted} style={{ marginTop: 4 }} />
      </Row>
      {member.bio ? <T variant="small" numberOfLines={2} style={{ color: colors.inkSoft }}>{member.bio}</T> : null}
      {member.skills?.length > 0 ? (
        <Row gap={6} wrap accessibilityLabel="Skills">
          {member.skills.slice(0, 3).map((skill, idx) => (
            <Chip key={`${skill}-${idx}`} label={skill} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
          ))}
        </Row>
      ) : null}
    </Card>
  );
};
