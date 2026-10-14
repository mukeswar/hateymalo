import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Flag,
  HandHeart,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react-native';
import API, { API_URL, errorMessage } from '../../lib/api';
import { confirm } from '../../lib/confirm';
import { formatNPR, pct as pctOf } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressBar,
  Row,
  Screen,
  Sheet,
  Skeleton,
  T,
  VerificationBadge,
} from '../../components/ui';
import CommentSection from '../../components/CommentSection';
import PostUpdatesSection from '../../components/PostUpdatesSection';
import ReportModal from '../../components/ReportModal';
import RejectionModal from '../../components/RejectionModal';
import DonationModal from '../../components/DonationModal';
import { colors, fonts, radius, space } from '../../theme';

// Port of frontend/src/pages/PostDetails.jsx.
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80';

const STATUS_STYLES = {
  PENDING: { label: 'Awaiting review', tone: { bg: colors.marigoldTint, fg: colors.marigoldText }, Icon: Clock },
  APPROVED: { label: 'Open for helpers', tone: { bg: colors.pineTint, fg: colors.pine }, Icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', tone: { bg: colors.pineTint, fg: colors.pine }, Icon: CheckCircle2 },
  REJECTED: { label: 'Not approved', tone: { bg: colors.brandTint, fg: colors.brand }, Icon: XCircle },
  HIDDEN: { label: 'Hidden', tone: { bg: colors.paperDeep, fg: colors.inkSoft }, Icon: EyeOff },
  ARCHIVED: { label: 'Archived', tone: { bg: colors.paperDeep, fg: colors.inkSoft }, Icon: EyeOff },
  DRAFT: { label: 'Draft', tone: { bg: colors.skyTint, fg: colors.sky }, Icon: Clock },
};

const formatWhen = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const idOf = (u) => (u && typeof u === 'object' ? u._id : u);

// Public link for sharing: the website's /post/:id when the API is deployed,
// otherwise the app's own deep link.
const shareUrlFor = (id) => {
  if (Platform.OS === 'web' && globalThis.location?.href) return globalThis.location.href;
  if (/^https:\/\//.test(API_URL) && !/localhost|127\.0\.0\.1/.test(API_URL)) {
    return `${API_URL.replace(/\/api\/?$/, '')}/post/${id}`;
  }
  return Linking.createURL(`/post/${id}`);
};

const PersonRow = ({ u, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="link" style={styles.personRow}>
    <Avatar name={u.name || 'Member'} src={u.profilePicture} size="md" />
    <View style={{ flex: 1, minWidth: 0 }}>
      <T variant="semibold" style={{ fontSize: 15 }} numberOfLines={1}>{u.name || 'Member'}</T>
      {u.location ? <T variant="caption" numberOfLines={1}>{u.location}</T> : null}
    </View>
    <ChevronRight size={16} color={colors.muted} />
  </Pressable>
);

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user, isAdmin, can } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [donateCampaign, setDonateCampaign] = useState(null);
  const [showDonate, setShowDonate] = useState(false);
  const [interestedPeople, setInterestedPeople] = useState(null);

  const fetchPost = useCallback(async () => {
    try {
      const res = await API.get(`/posts/${id}`);
      if (res.data.success) setPost(res.data.data);
    } catch (error) {
      setPost(null);
      showToast(errorMessage(error, 'Failed to fetch post details'), 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  // Fundraising campaigns linked to this request (Campaign.post), shown with their
  // real progress so supporters can give from here as well as from /donate.
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await API.get('/donations/campaigns');
      if (res.data.success) {
        setCampaigns((res.data.data || []).filter((c) => idOf(c.post) === id && c.status === 'ACTIVE'));
      }
    } catch {
      setCampaigns([]);
    }
  }, [id]);

  useEffect(() => {
    setActiveImage(0);
    setLoading(true);
    fetchPost();
    fetchCampaigns();
  }, [fetchPost, fetchCampaigns]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPost(), fetchCampaigns()]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={220} radius={radius.card} />
        <Skeleton height={32} width="80%" />
        <Skeleton height={18} width="55%" />
        <Skeleton height={200} radius={radius.card} />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <EmptyState
          icon={AlertTriangle}
          title="We couldn't find this request"
          message="It may have been removed, or the link may be incomplete."
          action="Back to help requests"
          onAction={() => router.replace('/explore')}
        />
      </Screen>
    );
  }

  const {
    title,
    description,
    category,
    location,
    images = [],
    requiredMembers = 1,
    dateTime,
    creator,
    status,
    joinedUsers = [],
    interestedUsers = [],
    rejectionReason,
    isFeatured,
  } = post;

  const isCreator = !!(user && creator && user._id === creator._id);
  const isJoined = !!(user && joinedUsers.some((u) => idOf(u) === user._id));
  const isInterested = !!(user && interestedUsers.some((u) => idOf(u) === user._id));
  const canModerate = isAdmin && can('canApprovePosts');
  const canDelete = isCreator || (isAdmin && can('canDeletePosts'));

  const joinedCount = joinedUsers.length;
  const remainingMembers = Math.max(0, requiredMembers - joinedCount);
  const pct = requiredMembers > 0 ? Math.min(100, Math.round((joinedCount / requiredMembers) * 100)) : 0;

  const gallery = images.length > 0 ? images : [FALLBACK_COVER];
  const cover = gallery[Math.min(activeImage, gallery.length - 1)];
  const when = formatWhen(dateTime);
  const statusStyle = STATUS_STYLES[status];
  const donationsOn = settings?.allowPublicDonations !== false;

  const requireLogin = (msg) => {
    showToast(msg, 'info');
    router.push('/login');
  };

  const handleJoinToggle = async () => {
    if (!user) return requireLogin('Please log in to join activities or offer help');
    setActionLoading(true);
    try {
      const res = await API.post(`/posts/${id}/join`);
      if (res.data.success) {
        setPost(res.data.data);
        showToast(res.data.message, 'success');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Action failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterestToggle = async () => {
    if (!user) return requireLogin('Please log in to show interest');
    setActionLoading(true);
    try {
      const res = await API.post(`/interactions/posts/${id}/interest`);
      if (res.data.success) {
        setPost(res.data.data);
        showToast(res.data.message, 'success');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Action failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, reason = '') => {
    setActionLoading(true);
    try {
      const res = await API.put(`/posts/${id}/status`, { status: newStatus, rejectionReason: reason });
      if (res.data.success) {
        setPost(res.data.data);
        showToast(`Status updated to ${newStatus}`, 'success');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Status update failed'), 'error');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  const handleToggleFeatured = async () => {
    setActionLoading(true);
    try {
      const res = await API.put(`/posts/${id}/feature`, { isFeatured: !isFeatured });
      if (res.data.success) {
        setPost((p) => ({ ...p, ...res.data.data }));
        showToast(res.data.message, 'success');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Could not update featured status'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!(await confirm('Delete this post?', 'Are you sure you want to delete this post?', { confirmText: 'Delete' }))) return;
    setActionLoading(true);
    try {
      const res = await API.delete(`/posts/${id}`);
      if (res.data.success) {
        showToast('Post removed successfully', 'success');
        if (router.canGoBack()) router.back();
        else router.replace('/explore');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Delete failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    const url = shareUrlFor(id);
    try {
      await Share.share(Platform.OS === 'ios' ? { title, url } : { title, message: `${title}\n${url}` });
    } catch {
      showToast('Could not share this link', 'error');
    }
  };

  const handleReportClick = () => {
    if (!user) return requireLogin('Please log in to submit safety reports');
    setShowReportModal(true);
  };

  // The post only carries interested user ids, so load names when the creator opens the list.
  const openMembers = async () => {
    setShowMembersModal(true);
    try {
      const res = await API.get(`/interactions/posts/${id}/interested-users`);
      if (res.data.success) setInterestedPeople(res.data.data);
    } catch {
      setInterestedPeople(null);
    }
  };
  const interestedList = interestedPeople || interestedUsers.map((u) => (typeof u === 'object' ? u : { _id: u }));

  const openProfile = (u) => {
    setShowMembersModal(false);
    router.push(`/profile/${idOf(u)}`);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: category || 'Post' }} />

      {canModerate && status === 'PENDING' ? (
        <View style={[styles.banner, { backgroundColor: colors.marigoldTint, borderColor: '#F1D6A6' }]}>
          <Row style={{ alignItems: 'flex-start' }} gap={10}>
            <ShieldCheck size={22} color={colors.marigoldText} />
            <View style={{ flex: 1 }}>
              <T variant="semibold">This request is waiting for review</T>
              <T variant="small" style={{ color: colors.inkSoft }}>Check it over before it is published publicly.</T>
            </View>
          </Row>
          <Row wrap>
            <Button title="Approve & publish" icon={CheckCircle2} variant="pine" size="sm" disabled={actionLoading} onPress={() => handleStatusChange('APPROVED')} />
            <Button title="Reject" icon={XCircle} size="sm" disabled={actionLoading} onPress={() => setShowRejectModal(true)} />
          </Row>
        </View>
      ) : null}

      {status === 'REJECTED' && rejectionReason ? (
        <View style={[styles.banner, { backgroundColor: colors.brandTint, borderColor: '#F2C9C3' }]} accessibilityRole="alert">
          <Row gap={8}>
            <AlertTriangle size={18} color={colors.brand} />
            <T variant="semibold" style={{ color: colors.brand, flex: 1 }}>Reason this request was not approved</T>
          </Row>
          <T style={{ paddingLeft: 26 }}>{rejectionReason}</T>
        </View>
      ) : null}

      {/* Hero + gallery */}
      <View style={{ gap: 10 }}>
        <View style={styles.hero}>
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel={images.length > 0 ? title : undefined} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
          {category ? (
            <View style={styles.heroChip}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>{category}</T>
            </View>
          ) : null}
          {isFeatured ? (
            <View style={[styles.heroChip, { left: undefined, right: 12, backgroundColor: colors.marigold, flexDirection: 'row', gap: 4, alignItems: 'center' }]}>
              <Star size={13} color={colors.ink} />
              <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>Featured</T>
            </View>
          ) : null}
        </View>
        {gallery.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {gallery.map((src, i) => (
              <Pressable
                key={`${src}-${i}`}
                onPress={() => setActiveImage(i)}
                accessibilityLabel={`Show photo ${i + 1} of ${gallery.length}`}
                accessibilityState={{ selected: i === activeImage }}
                style={[styles.thumb, i === activeImage ? { borderColor: colors.brand } : { opacity: 0.75 }]}
              >
                <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Title block */}
      <View style={{ gap: 10 }}>
        {statusStyle ? <Chip label={statusStyle.label} icon={statusStyle.Icon} tone={statusStyle.tone} /> : null}
        <T variant="display" style={{ fontSize: 28, lineHeight: 34 }}>{title}</T>
        {location ? (
          <Row style={{ alignItems: 'flex-start' }}>
            <MapPin size={16} color={colors.brand} style={{ marginTop: 3 }} />
            <T style={{ flex: 1 }}>{location}</T>
          </Row>
        ) : null}
        {when ? (
          <Row style={{ alignItems: 'flex-start' }}>
            <CalendarDays size={16} color={colors.brand} style={{ marginTop: 3 }} />
            <T style={{ flex: 1 }}>
              {when.day} <T style={{ color: colors.muted }}>· {when.time}</T>
            </T>
          </Row>
        ) : null}
      </View>

      {creator ? (
        <Card onPress={() => router.push(`/profile/${creator._id}`)} accessibilityLabel={`Organised by ${creator.name}`}>
          <Row gap={12}>
            <Avatar name={creator.name} src={creator.profilePicture} size="lg" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.semibold }}>Organised by</T>
              <T variant="semibold" numberOfLines={1}>{creator.name}</T>
              <VerificationBadge level={creator.memberLevel} isVerified={creator.isVerified} />
              {creator.location ? <T variant="small" numberOfLines={1}>{creator.location}</T> : null}
            </View>
            <ChevronRight size={18} color={colors.muted} />
          </Row>
        </Card>
      ) : null}

      {/* Lend a hand */}
      <Card style={{ gap: space.lg }}>
        <View>
          <T variant="eyebrowDeva">हात दिनुहोस्</T>
          <T variant="h1">Lend a hand</T>
        </View>
        <View style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <T style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink }}>{joinedCount}</T>
              <T style={{ color: colors.muted }}> of {requiredMembers} helpers joined</T>
            </T>
            <T variant="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>{pct}%</T>
          </Row>
          <ProgressBar value={pct} />
          <T variant="small">
            {remainingMembers > 0
              ? `${remainingMembers} more ${remainingMembers === 1 ? 'helper' : 'helpers'} needed`
              : 'All helper spots are filled'}
          </T>
        </View>

        {joinedCount > 0 ? (
          <Row gap={10}>
            <View style={{ flexDirection: 'row' }}>
              {joinedUsers.slice(0, 6).map((u, i) => (
                <View key={idOf(u)} style={[styles.stackAvatar, i > 0 && { marginLeft: -8 }]}>
                  <Avatar name={u.name || 'Member'} src={u.profilePicture} size="sm" />
                </View>
              ))}
            </View>
            {joinedCount > 6 ? <T variant="small">+{joinedCount - 6} more</T> : null}
          </Row>
        ) : null}

        {status === 'APPROVED' ? (
          <Button
            title={isJoined ? "You've joined · Leave" : 'Join and help'}
            icon={isJoined ? UserCheck : UserPlus}
            variant={isJoined ? 'ghost' : 'primary'}
            size="lg"
            full
            disabled={actionLoading}
            onPress={handleJoinToggle}
          />
        ) : null}

        <Row>
          <Pressable
            onPress={handleInterestToggle}
            disabled={actionLoading}
            accessibilityRole="button"
            accessibilityState={{ selected: isInterested }}
            style={[styles.halfBtn, isInterested && { backgroundColor: colors.brandTint, borderColor: '#F2C9C3' }]}
          >
            <Heart size={17} color={isInterested ? colors.brand : colors.ink} fill={isInterested ? colors.brand : 'transparent'} />
            <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: isInterested ? colors.brand : colors.ink }}>
              Interested · {interestedUsers.length}
            </T>
          </Pressable>
          <Pressable onPress={handleShare} accessibilityRole="button" style={styles.halfBtn}>
            <Share2 size={17} color={colors.ink} />
            <T style={{ fontFamily: fonts.semibold, fontSize: 15 }}>Share</T>
          </Pressable>
        </Row>

        {!isCreator ? (
          <Pressable onPress={handleReportClick} accessibilityRole="button" style={styles.reportBtn}>
            <Flag size={15} color={colors.muted} />
            <T variant="small">Report this request</T>
          </Pressable>
        ) : null}
      </Card>

      {/* Linked fundraising campaigns */}
      {campaigns.length > 0 && donationsOn ? (
        <Card style={{ gap: space.lg }}>
          <Row gap={10}>
            <View style={styles.pineTile}>
              <HandHeart size={20} color={colors.pine} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="h2">Support with a donation</T>
              <T variant="small">Fundraising linked to this request.</T>
            </View>
          </Row>
          {campaigns.map((c) => {
            const p = pctOf(c.raisedAmount, c.goalAmount);
            return (
              <View key={c._id} style={styles.campaign}>
                <T variant="semibold">{c.title}</T>
                <ProgressBar value={p} />
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="small">
                    <T style={{ fontFamily: fonts.bold, color: colors.pine, fontSize: 14 }}>{formatNPR(c.raisedAmount)}</T> of {formatNPR(c.goalAmount)}
                  </T>
                  <T variant="caption">{Math.round(p)}%</T>
                </Row>
                <Row>
                  <Button
                    title="Donate"
                    icon={HandHeart}
                    variant="pine"
                    size="sm"
                    onPress={() => {
                      setDonateCampaign(c);
                      setShowDonate(true);
                    }}
                  />
                  <Button title="See ledger" variant="ghost" size="sm" onPress={() => router.push('/donate')} />
                </Row>
              </View>
            );
          })}
        </Card>
      ) : null}

      {/* Owner / admin controls */}
      {isCreator || isAdmin ? (
        <View style={styles.sunken}>
          <T variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.semibold }}>
            {isCreator ? 'Your request' : 'Admin controls'}
          </T>
          {isCreator && status === 'APPROVED' ? (
            <Button title="Mark as completed" icon={CheckCircle2} variant="pine" full disabled={actionLoading} onPress={() => handleStatusChange('COMPLETED')} />
          ) : null}
          {canModerate && ['APPROVED', 'COMPLETED'].includes(status) ? (
            <Button
              title={isFeatured ? 'Remove from featured' : 'Feature on home page'}
              icon={Star}
              variant="ghost"
              full
              disabled={actionLoading}
              onPress={handleToggleFeatured}
            />
          ) : null}
          {canDelete ? (
            <Button title="Delete post" icon={Trash2} variant="danger" full disabled={actionLoading} onPress={handleDeletePost} />
          ) : null}
        </View>
      ) : null}

      <Card style={{ gap: 10 }}>
        <T variant="h2">About this request</T>
        <T style={{ fontSize: 17, lineHeight: 26 }}>{description}</T>
      </Card>

      <Card style={{ gap: space.md }}>
        <Row>
          <Users size={20} color={colors.pine} />
          <T variant="h2" style={{ flexShrink: 1 }}>Helpers who joined</T>
          <Chip label={String(joinedCount)} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 2, paddingHorizontal: 10 }} />
        </Row>
        {isCreator ? (
          <Button title="View interested & joined" icon={Eye} variant="ghost" size="sm" style={{ alignSelf: 'flex-start' }} onPress={openMembers} />
        ) : null}
        {joinedUsers.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {joinedUsers.map((u) => (
              <Pressable key={idOf(u)} onPress={() => openProfile(u)} accessibilityRole="link" style={styles.personPill}>
                <Avatar name={u.name || 'Member'} src={u.profilePicture} size="sm" />
                <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft }}>{u.name || 'Member'}</T>
              </Pressable>
            ))}
          </View>
        ) : (
          <T variant="small">No one has joined yet{status === 'APPROVED' ? ' — you could be the first to lend a hand.' : '.'}</T>
        )}
      </Card>

      <PostUpdatesSection postId={id} isCreator={isCreator} />
      <CommentSection postId={id} />

      <Button title="Back" icon={ArrowLeft} variant="text" style={{ alignSelf: 'center' }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))} />

      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(reason) => handleStatusChange('REJECTED', reason)}
        postTitle={title}
      />

      <ReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} targetType="POST" targetId={id} targetTitle={title} />

      <DonationModal
        isOpen={showDonate}
        campaign={donateCampaign}
        onClose={() => setShowDonate(false)}
        onSuccess={fetchCampaigns}
      />

      <Sheet visible={showMembersModal} onClose={() => setShowMembersModal(false)} title="People on this request">
        <View style={{ gap: 10 }}>
          <Row gap={6}>
            <UserPlus size={16} color={colors.pine} />
            <T variant="eyebrow" style={{ color: colors.pine }}>Joined ({joinedUsers.length})</T>
          </Row>
          {joinedUsers.length > 0 ? (
            joinedUsers.map((u) => <PersonRow key={idOf(u)} u={u} onPress={() => openProfile(u)} />)
          ) : (
            <T variant="small">No members joined yet.</T>
          )}
        </View>
        <View style={{ gap: 10 }}>
          <Row gap={6}>
            <Heart size={16} color={colors.brand} fill={colors.brand} />
            <T variant="eyebrow">Interested ({interestedList.length})</T>
          </Row>
          {interestedList.length > 0 ? (
            interestedList.map((u) => <PersonRow key={idOf(u)} u={u} onPress={() => openProfile(u)} />)
          ) : (
            <T variant="small">No members showed interest yet.</T>
          )}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: radius.card, padding: space.lg, gap: space.md },
  hero: { aspectRatio: 16 / 10, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.paperDeep, borderWidth: 1, borderColor: colors.sand },
  heroChip: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  thumb: { width: 84, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  stackAvatar: { borderRadius: 999, borderWidth: 2, borderColor: colors.white },
  halfBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
  },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40 },
  pineTile: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center' },
  campaign: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.sand, borderRadius: radius.md, padding: space.md, gap: 8 },
  sunken: { backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: space.lg, gap: 10 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: space.md,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  personPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.sand,
  },
});
