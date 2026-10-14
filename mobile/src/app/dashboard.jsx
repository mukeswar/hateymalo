import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Heart,
  Hourglass,
  LogIn,
  Mail,
  MapPin,
  PenLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { canAccessSection } from '../lib/adminAccess';
import { formatDate } from '../lib/format';
import { colors, fonts, radius } from '../theme';
import {
  Avatar,
  Button,
  Card,
  Chip,
  ChipBar,
  EmptyState,
  ErrorState,
  Row,
  Screen,
  Skeleton,
  T,
  VerificationBadge,
} from '../components/ui';
import PostCard from '../components/PostCard';
import BadgeList from '../components/BadgeList';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordCard from '../components/ChangePasswordCard';

// Port of frontend/src/pages/UserDashboard.jsx.
const STATUS_STYLES = {
  PENDING: { label: 'Pending review', tone: { bg: colors.marigoldTint, fg: colors.marigoldText }, icon: Hourglass },
  APPROVED: { label: 'Approved', tone: { bg: colors.pineTint, fg: colors.pine }, icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', tone: { bg: colors.pineTint, fg: colors.pine }, icon: CheckCircle2 },
  REJECTED: { label: 'Not approved', tone: { bg: colors.brandTint, fg: colors.brand }, icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', tone: { bg: colors.brandTint, fg: colors.brand }, icon: AlertTriangle },
  DRAFT: { label: 'Draft', tone: { bg: colors.skyTint, fg: colors.sky }, icon: PenLine },
  HIDDEN: { label: 'Hidden', tone: { bg: colors.paperDeep, fg: colors.inkSoft }, icon: Clock },
  ARCHIVED: { label: 'Archived', tone: { bg: colors.paperDeep, fg: colors.inkSoft }, icon: Clock },
};

const PostStatus = ({ status }) => {
  const s = STATUS_STYLES[status] || { label: status || 'Unknown', tone: { bg: colors.skyTint, fg: colors.sky }, icon: Clock };
  return <Chip label={s.label} icon={s.icon} tone={s.tone} style={{ paddingVertical: 4 }} />;
};

const greetingFor = (date = new Date()) => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const sameId = (u, id) => u === id || u?._id === id;

const IconDot = ({ icon: Icon, tone, size = 40 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
    <Icon size={18} color={tone.fg} />
  </View>
);

const QuickLink = ({ icon: Icon, color, label, onPress }) => (
  <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={label}>
    <Icon size={20} color={color} />
    <T variant="semibold" style={{ flex: 1 }}>{label}</T>
    <ArrowRight size={16} color={colors.muted} />
  </Card>
);

export default function Dashboard() {
  const auth = useAuth();
  const { user, isAdmin, loading: authLoading } = auth;
  const [showEditModal, setShowEditModal] = useState(false);
  const [myPosts, setMyPosts] = useState([]);
  const [joinedActivities, setJoinedActivities] = useState([]);
  const [interestedPosts, setInterestedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my-posts');

  const userId = user?._id;

  const fetchDashboardData = useCallback(async () => {
    if (!userId) return;
    try {
      const [postsRes, notifRes] = await Promise.all([
        API.get('/posts?status=ALL&sort=newest'),
        API.get('/notifications'),
      ]);
      if (postsRes.data?.success) {
        const allPosts = postsRes.data.data || [];
        setMyPosts(allPosts.filter((p) => sameId(p.creator, userId)));
        setJoinedActivities(allPosts.filter((p) => p.joinedUsers?.some((u) => sameId(u, userId))));
        setInterestedPosts(allPosts.filter((p) => p.interestedUsers?.some((u) => sameId(u, userId))));
      }
      if (notifRes.data?.success) setNotifications(notifRes.data.data || []);
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not load your dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchDashboardData();
    else if (!authLoading) setLoading(false);
  }, [userId, authLoading, fetchDashboardData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), auth.refreshUser()]);
    setRefreshing(false);
  };

  if (authLoading) return <Screen><DashboardSkeleton /></Screen>;

  if (!user) {
    return (
      <Screen>
        <EmptyState
          icon={LogIn}
          title="Sign in to see your dashboard"
          message="Your posts, joined drives and badges live here."
          action="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  if (loading) return <Screen><DashboardSkeleton /></Screen>;

  if (error && !myPosts.length && !notifications.length) {
    return <Screen><ErrorState message={error} onRetry={() => { setLoading(true); fetchDashboardData(); }} /></Screen>;
  }

  const approvedPosts = myPosts.filter((p) => p.status === 'APPROVED');
  const pendingPosts = myPosts.filter((p) => p.status === 'PENDING');
  const rejectedPosts = myPosts.filter((p) => p.status === 'REJECTED');
  const firstName = user.name?.split(' ')[0] || 'friend';

  const stats = [
    { label: 'Posts created', value: myPosts.length, icon: FileText, tone: { bg: colors.brandTint, fg: colors.brand } },
    { label: 'Approved & public', value: approvedPosts.length, icon: CheckCircle2, tone: { bg: colors.pineTint, fg: colors.pine } },
    { label: 'Drives joined', value: joinedActivities.length, icon: UserCheck, tone: { bg: colors.skyTint, fg: colors.sky } },
    { label: 'Saved / interested', value: interestedPosts.length, icon: Heart, tone: { bg: colors.marigoldTint, fg: colors.marigoldText } },
  ];

  const tabs = [
    { value: 'my-posts', label: `My posts · ${myPosts.length}` },
    { value: 'joined', label: `Joined drives · ${joinedActivities.length}` },
    { value: 'interested', label: `Saved / interested · ${interestedPosts.length}` },
    { value: 'notifications', label: `Notifications · ${notifications.length}` },
  ];

  const canModerate = canAccessSection('canApprovePosts', auth);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {/* Greeting header */}
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <Avatar name={user.name} src={user.profilePicture} size="lg" />
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="eyebrowDeva">नमस्ते, {firstName}</T>
          <T variant="h1">{greetingFor()}, {firstName}</T>
          <VerificationBadge level={user.memberLevel} isVerified={user.isVerified} />
          {user.location ? (
            <Row gap={6}>
              <MapPin size={14} color={colors.brand} />
              <T variant="small">{user.location}</T>
            </Row>
          ) : null}
          {user.email ? (
            <Row gap={6}>
              <Mail size={14} color={colors.muted} />
              <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{user.email}</T>
            </Row>
          ) : null}
        </View>
      </Row>

      <Row gap={8} wrap>
        <Button title="Ask or offer help" icon={Plus} size="sm" onPress={() => router.push('/create-post')} />
        <Button title="Explore requests" icon={Compass} size="sm" variant="ghost" onPress={() => router.push('/explore')} />
        <Button title="Edit profile" icon={PenLine} size="sm" variant="ghost" onPress={() => setShowEditModal(true)} />
      </Row>

      {/* Staff shortcut */}
      {isAdmin ? (
        <View style={{ backgroundColor: colors.night, borderRadius: radius.card, padding: 18, gap: 14 }}>
          <Row gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Row gap={8} wrap>
                <T style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.white }}>Staff tools</T>
                <Chip label={user.role} tone={{ bg: colors.brand, fg: colors.white }} style={{ paddingVertical: 2, paddingHorizontal: 9 }} />
              </Row>
              <T variant="small" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Review pending submissions, manage members and platform settings.
              </T>
            </View>
          </Row>
          <Row gap={8} wrap>
            <Button title="Admin command center" icon={ShieldCheck} size="sm" variant="ghost" onPress={() => router.push('/admin')} />
            {canModerate ? (
              <Button title="Moderation queue" iconRight={ArrowRight} size="sm" variant="soft" onPress={() => router.push('/admin/approval')} />
            ) : null}
          </Row>
        </View>
      ) : null}

      {/* Stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }} accessibilityLabel="Your activity">
        {stats.map(({ label, value, icon, tone }) => (
          <Card key={label} style={{ flexGrow: 1, flexBasis: '45%', gap: 10 }}>
            <IconDot icon={icon} tone={tone} />
            <T style={{ fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 36, color: colors.ink }}>{value}</T>
            <T variant="small" style={{ marginTop: -6 }}>{label}</T>
          </Card>
        ))}
      </View>

      {/* Status notices for own posts */}
      {pendingPosts.length > 0 ? (
        <Notice
          icon={Hourglass}
          tone={{ bg: colors.marigoldTint, fg: colors.marigoldText, border: '#F2D3A0' }}
          title={`${pendingPosts.length} ${pendingPosts.length === 1 ? 'post is' : 'posts are'} waiting for review`}
          text="A moderator checks each post before it goes public. You'll get a notification once it's reviewed."
        />
      ) : null}
      {rejectedPosts.length > 0 ? (
        <Notice
          icon={AlertTriangle}
          tone={{ bg: colors.brandTint, fg: colors.brand, border: '#F2C9C3' }}
          title={`${rejectedPosts.length} ${rejectedPosts.length === 1 ? 'post was' : 'posts were'} not approved`}
          text="See the reason under each post in “My posts” below."
        />
      ) : null}

      {/* Badges */}
      <Card>
        <BadgeList userId={user._id} />
      </Card>

      {/* Tabs */}
      <View style={{ marginHorizontal: -16 }}>
        <ChipBar options={tabs} value={activeTab} onChange={setActiveTab} />
      </View>

      {activeTab === 'my-posts' ? (
        myPosts.length > 0 ? (
          myPosts.map((post) => (
            <View key={post._id} style={{ gap: 10 }}>
              <PostStatus status={post.status} />
              <PostCard post={post} />
              {post.status === 'REJECTED' ? (
                <View style={{ backgroundColor: colors.brandTint, borderRadius: radius.md, borderWidth: 1, borderColor: '#F2C9C3', padding: 14 }}>
                  <T variant="semibold" style={{ fontSize: 14, color: colors.brandDark }}>Reason from the moderator</T>
                  <T variant="small" style={{ color: colors.inkSoft, marginTop: 2 }}>{post.rejectionReason || 'No reason was given.'}</T>
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Card>
            <EmptyState
              icon={FileText}
              title="You haven't posted yet"
              message="Need a hand, or want to organise something in your neighbourhood? Create your first post — it takes a minute."
              action="Ask or offer help"
              onAction={() => router.push('/create-post')}
            />
          </Card>
        )
      ) : null}

      {activeTab === 'joined' ? (
        joinedActivities.length > 0 ? (
          joinedActivities.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
          <Card>
            <EmptyState
              icon={UserCheck}
              title="No drives joined yet"
              message="Browse help requests and community drives near you, and join one that fits your time."
              action="Explore help requests"
              onAction={() => router.push('/explore')}
            />
          </Card>
        )
      ) : null}

      {activeTab === 'interested' ? (
        interestedPosts.length > 0 ? (
          interestedPosts.map((post) => <PostCard key={post._id} post={post} />)
        ) : (
          <Card>
            <EmptyState
              icon={Heart}
              title="Nothing saved yet"
              message="Mark a post as interested and it will be kept here for later."
              action="Discover initiatives"
              onAction={() => router.push('/explore')}
            />
          </Card>
        )
      ) : null}

      {activeTab === 'notifications' ? (
        notifications.length > 0 ? (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {notifications.map((n, i) => (
              <View
                key={n._id}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  padding: 16,
                  backgroundColor: n.read ? 'transparent' : 'rgba(251,233,230,0.45)',
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.sand,
                }}
              >
                <IconDot icon={Bell} tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="semibold">{n.title}</T>
                  {n.message ? <T variant="small" style={{ color: colors.inkSoft }}>{n.message}</T> : null}
                  <Row gap={4}>
                    <Clock size={13} color={colors.muted} />
                    <T variant="caption">{formatDate(n.createdAt)}</T>
                  </Row>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.sand, alignItems: 'center' }}
            >
              <T variant="semibold" style={{ color: colors.brand }}>Open notifications</T>
            </Pressable>
          </Card>
        ) : (
          <Card>
            <EmptyState icon={Bell} title="No notifications yet" message="Updates on your posts and the drives you join will appear here." />
          </Card>
        )
      ) : null}

      {/* Quick links */}
      <View style={{ gap: 10 }}>
        <QuickLink icon={User} color={colors.sky} label="View my public profile" onPress={() => router.push(`/profile/${user._id}`)} />
        <QuickLink icon={CalendarDays} color={colors.pine} label="Upcoming events" onPress={() => router.push('/events')} />
        <QuickLink icon={ShieldCheck} color={colors.brand} label="Organisations" onPress={() => router.push('/organizations')} />
      </View>

      <ChangePasswordCard />

      <EditProfileModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
    </Screen>
  );
}

const Notice = ({ icon: Icon, tone, title, text }) => (
  <View style={{ flexDirection: 'row', gap: 12, backgroundColor: tone.bg, borderWidth: 1, borderColor: tone.border, borderRadius: radius.card, padding: 16 }}>
    <Icon size={20} color={tone.fg} style={{ marginTop: 2 }} />
    <View style={{ flex: 1 }}>
      <T variant="semibold">{title}</T>
      <T variant="small" style={{ color: colors.inkSoft, marginTop: 2 }}>{text}</T>
    </View>
  </View>
);

const DashboardSkeleton = () => (
  <View style={{ gap: 14 }} accessibilityLabel="Loading your dashboard">
    <Skeleton height={20} width={160} radius={999} />
    <Skeleton height={40} width="80%" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={120} width="47%" radius={radius.card} />)}
    </View>
    <Skeleton height={220} radius={radius.card} />
  </View>
);
