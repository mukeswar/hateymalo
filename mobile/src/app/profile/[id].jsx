import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import {
  Building2,
  CalendarDays,
  FileText,
  Flag,
  Globe,
  Heart,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Sparkles,
  UserCheck,
} from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors, fonts, radius, shadow } from '../../theme';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Row,
  Screen,
  Skeleton,
  T,
  VerificationBadge,
} from '../../components/ui';
import PostCard from '../../components/PostCard';
import BadgeList from '../../components/BadgeList';
import ReportModal from '../../components/ReportModal';
import EditProfileModal from '../../components/EditProfileModal';

// Port of frontend/src/pages/UserProfile.jsx.
const COVER_IMAGE = 'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1200&q=70';

const safeWebsite = (url = '') => {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(withProto) ? withProto : null;
};

const memberSince = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const sameId = (u, id) => u === id || u?._id === id;

export default function UserProfile() {
  const { id } = useLocalSearchParams();
  const { user: currentUser, refreshUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const targetId = id || currentUser?._id;

  const fetchProfile = useCallback(async () => {
    if (!targetId) { setLoading(false); setNotFound(true); return; }
    try {
      const [userRes, postsRes] = await Promise.all([
        API.get(`/auth/user/${targetId}`).catch((err) => {
          // Own profile can still be shown from /auth/me (same fallback as the website).
          if (currentUser && currentUser._id === targetId) return API.get('/auth/me');
          throw err;
        }),
        API.get('/posts?sort=newest'),
      ]);
      if (userRes.data?.success) { setProfileUser(userRes.data.data); setNotFound(false); }
      if (postsRes.data?.success) setUserPosts((postsRes.data.data || []).filter((p) => sameId(p.creator, targetId)));
      setError('');
    } catch (err) {
      const status = err?.response?.status;
      // A malformed id currently comes back as a 500 "Cast to ObjectId" error from the API.
      if (status === 404 || status === 400 || /Cast to ObjectId/i.test(err?.response?.data?.message || '')) setNotFound(true);
      else setError(errorMessage(err, 'Could not load this profile.'));
    } finally {
      setLoading(false);
    }
  }, [targetId, currentUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Screen>
        <View accessibilityLabel="Loading profile" style={{ gap: 16 }}>
          <Skeleton height={150} radius={radius.card} />
          <Skeleton height={28} width="60%" />
          <Skeleton height={220} radius={radius.card} />
        </View>
      </Screen>
    );
  }

  if (error && !profileUser) {
    return <Screen><ErrorState message={error} onRetry={() => { setLoading(true); fetchProfile(); }} /></Screen>;
  }

  const u = profileUser;

  if (!u || notFound) {
    return (
      <Screen>
        <EmptyState
          icon={UserCheck}
          title="We couldn't find this profile"
          message="The member may have left, or the link may be incorrect."
          action="Browse members"
          onAction={() => router.replace('/members')}
        />
      </Screen>
    );
  }

  const isSelf = !!currentUser && currentUser._id === u._id;
  const org = u.orgDetails || {};
  const isOrg = u.memberLevel === 'ORGANIZATION' || !!org.orgName;
  const website = safeWebsite(org.website);
  const since = memberSince(u.createdAt);

  const stats = [
    typeof u.totalPosts === 'number' && { label: 'Approved posts', value: u.totalPosts, icon: FileText, tone: { bg: colors.brandTint, fg: colors.brand } },
    typeof u.totalActivitiesJoined === 'number' && { label: 'Drives joined', value: u.totalActivitiesJoined, icon: UserCheck, tone: { bg: colors.pineTint, fg: colors.pine } },
  ].filter(Boolean);

  const openWebsite = () => WebBrowser.openBrowserAsync(website).catch(() => {});
  const callPhone = () => Linking.openURL(`tel:${org.contactPhone.replace(/[^\d+]/g, '')}`).catch(() => {});

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: isSelf ? 'My profile' : u.name || 'Profile' }} />

      {/* Cover + identity */}
      <View>
        <View style={{ height: 130, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.paperDeep }}>
          <Image source={{ uri: COVER_IMAGE }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityIgnoresInvertColors />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(31,27,22,0.18)' }]} />
        </View>
        <View style={{ marginTop: -52, paddingHorizontal: 8 }}>
          <View style={{ alignSelf: 'flex-start', borderRadius: 60, borderWidth: 5, borderColor: colors.paper, ...shadow.lift }}>
            <Avatar name={u.name} src={u.profilePicture} size={104} />
          </View>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <T variant="h1">{u.name}</T>
        <VerificationBadge level={u.memberLevel} isVerified={u.isVerified} />
        {isOrg && org.orgName && org.orgName !== u.name ? (
          <Row gap={6} wrap>
            <Building2 size={15} color={colors.muted} />
            <T variant="medium" style={{ color: colors.inkSoft }}>{org.orgName}</T>
            {org.orgType ? <Chip label={org.orgType} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 2 }} /> : null}
          </Row>
        ) : null}
        <Row gap={6}>
          <MapPin size={15} color={colors.brand} />
          <T variant="small">{u.location || 'Nepal'}</T>
        </Row>
        {since ? (
          <Row gap={6}>
            <CalendarDays size={15} color={colors.muted} />
            <T variant="small">Member since {since}</T>
          </Row>
        ) : null}
        {isSelf && currentUser.email ? (
          <Row gap={6} wrap>
            <Mail size={15} color={colors.muted} />
            <T variant="small">{currentUser.email}</T>
            <T variant="caption">(only you can see this)</T>
          </Row>
        ) : null}
      </View>

      <Row gap={8} wrap>
        {isSelf ? (
          <>
            <Button title="Edit profile" icon={PenLine} onPress={() => setShowEditModal(true)} />
            <Button title="My dashboard" variant="ghost" onPress={() => router.push('/dashboard')} />
          </>
        ) : (
          <Button title="Report" icon={Flag} variant="text" size="sm" onPress={() => setShowReportModal(true)} style={{ paddingHorizontal: 6 }} />
        )}
      </Row>

      {stats.length > 0 ? (
        <Row gap={12}>
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <Card key={label} style={{ flex: 1, gap: 8 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={tone.fg} />
              </View>
              <T style={{ fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32, color: colors.ink }}>{value}</T>
              <T variant="small" style={{ marginTop: -4 }}>{label}</T>
            </Card>
          ))}
        </Row>
      ) : null}

      <Card style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <T variant="h3">About</T>
          <T variant="body">{u.bio || 'Passionate community contributor on HATEYMALO.'}</T>
        </View>
        {u.skills?.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Row gap={6}>
              <Sparkles size={15} color={colors.pine} />
              <T variant="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>Skills</T>
            </Row>
            <Row gap={6} wrap>
              {u.skills.map((skill, idx) => (
                <Chip key={`${skill}-${idx}`} label={skill} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 4 }} />
              ))}
            </Row>
          </View>
        ) : null}
        {u.interests?.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Row gap={6}>
              <Heart size={15} color={colors.brand} />
              <T variant="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>Causes they care about</T>
            </Row>
            <Row gap={6} wrap>
              {u.interests.map((interest, idx) => (
                <Chip key={`${interest}-${idx}`} label={interest} tone={{ bg: colors.brandTint, fg: colors.brand }} style={{ paddingVertical: 4 }} />
              ))}
            </Row>
          </View>
        ) : null}
      </Card>

      {isOrg && (org.orgName || org.description || website || org.contactPhone) ? (
        <Card style={{ gap: 12 }}>
          <Row gap={8}>
            <Building2 size={20} color={colors.pine} />
            <T variant="h3">Organisation</T>
          </Row>
          {org.orgName ? (
            <View>
              <T variant="semibold">{org.orgName}</T>
              {org.orgType ? <T variant="small">{org.orgType}</T> : null}
            </View>
          ) : null}
          {org.description ? <T variant="body">{org.description}</T> : null}
          {website ? (
            <Pressable onPress={openWebsite} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color={colors.sky} />
              <T style={{ fontFamily: fonts.medium, color: colors.sky, flexShrink: 1 }}>{org.website}</T>
            </Pressable>
          ) : null}
          {org.contactPhone ? (
            <Pressable onPress={callPhone} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Phone size={16} color={colors.inkSoft} />
              <T style={{ fontFamily: fonts.medium, color: colors.inkSoft }}>{org.contactPhone}</T>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <BadgeList userId={u._id} />
      </Card>

      {/* Posts */}
      <View style={{ gap: 4 }}>
        <T variant="eyebrow">Activity</T>
        <T variant="h2">
          {isSelf ? 'Your posts' : 'Posts & initiatives'}{' '}
          <T style={{ fontFamily: fonts.body, fontSize: 17, color: colors.muted }}>({userPosts.length})</T>
        </T>
      </View>

      {userPosts.length > 0 ? (
        userPosts.map((post) => <PostCard key={post._id} post={post} />)
      ) : (
        <Card>
          <EmptyState
            icon={FileText}
            title={isSelf ? "You haven't published a post yet." : 'No published posts yet.'}
            message={isSelf ? 'Ask for help or offer it — it only takes a minute.' : 'Their posts will appear here once published.'}
            action={isSelf ? 'Ask or offer help' : 'Explore help requests'}
            onAction={() => router.push(isSelf ? '/create-post' : '/explore')}
          />
        </Card>
      )}

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="USER"
        targetId={u._id}
        targetTitle={u.name}
      />
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          refreshUser();
          fetchProfile();
        }}
      />
    </Screen>
  );
}
