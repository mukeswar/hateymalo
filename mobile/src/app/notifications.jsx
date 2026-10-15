import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Handshake,
  Heart,
  LogIn,
  Megaphone,
  MessageSquare,
  UserPlus,
} from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDateTime, timeAgo } from '../lib/format';
import { colors, fonts } from '../theme';
import { Chip, EmptyState, ErrorState, Loading, Row, Screen, T } from '../components/ui';

// Full-screen port of frontend/src/components/NotificationDropdown.jsx.
const TONES = {
  pine: { bg: colors.pineTint, fg: colors.pine },
  brand: { bg: colors.brandTint, fg: colors.brand },
  sky: { bg: colors.skyTint, fg: colors.sky },
  marigold: { bg: colors.marigoldTint, fg: colors.marigoldText },
  plain: { bg: colors.paperDeep, fg: colors.inkSoft },
};

const getIcon = (type) => {
  switch (type) {
    case 'POST_APPROVED': return { Icon: CheckCircle2, tone: TONES.pine };
    case 'POST_REJECTED': return { Icon: AlertTriangle, tone: TONES.brand };
    case 'INTEREST': return { Icon: Heart, tone: TONES.brand };
    case 'JOIN': return { Icon: UserPlus, tone: TONES.pine };
    case 'COMMENT':
    case 'REPLY': return { Icon: MessageSquare, tone: TONES.sky };
    case 'POST_UPDATE':
    case 'ANNOUNCEMENT':
    case 'EVENT': return { Icon: Megaphone, tone: TONES.marigold };
    case 'WARNING': return { Icon: AlertTriangle, tone: TONES.marigold };
    case 'SPONSORSHIP': return { Icon: Handshake, tone: TONES.pine };
    case 'ADVERTISING': return { Icon: Megaphone, tone: TONES.brand };
    default: return { Icon: Bell, tone: TONES.plain };
  }
};

// Map a web path stored in `notification.link` (sponsorship notifications) to
// the matching app route. Unknown links return null and are ignored.
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const mapWebLink = (link) => {
  if (typeof link !== 'string' || !link.startsWith('/')) return null;
  const [rawPath, query = ''] = link.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const params = {};
  query.split('&').filter(Boolean).forEach((kv) => {
    const [k, val = ''] = kv.split('=');
    try { params[decodeURIComponent(k)] = decodeURIComponent(val); } catch { /* malformed */ }
  });
  if (path === '/sponsor/portal') return '/sponsor/portal';
  if (path === '/sponsor') return '/sponsor';
  let m = path.match(/^\/sponsor\/portal\/deals\/([^/]+)$/);
  if (m && OBJECT_ID.test(m[1])) return `/sponsor/portal/deal/${m[1]}`;
  m = path.match(/^\/sponsor\/portal\/accounts\/([^/]+)$/);
  if (m && OBJECT_ID.test(m[1])) return `/sponsor/portal/account/${m[1]}`;
  m = path.match(/^\/sponsor\/opportunities\/([^/]+)$/);
  if (m && OBJECT_ID.test(m[1])) return `/sponsor/${m[1]}`;
  if (path === '/sponsor/ads') return '/sponsor/ads';
  m = path.match(/^\/sponsor\/ads\/([^/]+)$/);
  if (m && OBJECT_ID.test(m[1])) return `/sponsor/ads/${m[1]}`;
  m = path.match(/^\/organize\/([^/]+)$/);
  if (m && OBJECT_ID.test(m[1])) return `/sponsor/organize/${m[1]}`;
  if (path === '/admin' || path === '/admin-dashboard') {
    if (params.tab === 'sponsorDeals') return params.deal && OBJECT_ID.test(params.deal) ? `/admin/sponsorDeals?deal=${params.deal}` : '/admin/sponsorDeals';
    if (params.tab === 'sponsors') return '/admin/sponsors';
    if (params.tab === 'sponsorship') return '/admin/sponsorship';
    if (params.tab === 'ads') return params.campaign && OBJECT_ID.test(params.campaign) ? `/admin/ads?campaign=${params.campaign}` : '/admin/ads';
    if (params.tab === 'adPlacements') return '/admin/adPlacements';
    return null;
  }
  return null;
};

// Resolve which app screen a notification opens, from the entity it references
// (web: /blogs/:id, /events/:id, /post/:id, announcements → home banner).
const getDestination = (n) => {
  const blogId = n.blog?._id || n.blog;
  const eventId = n.event?._id || n.event;
  const postId = n.post?._id || n.post;
  const announcementId = n.announcement?._id || n.announcement;
  if (blogId) return `/blog/${blogId}`;
  if (eventId) return `/event/${eventId}`;
  if (postId) return `/post/${postId}`;
  if (announcementId) return '/';
  return mapWebLink(n.link);
};

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await API.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
        setError('');
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load your notifications.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh when the screen gains focus and poll every 15s while it is visible (same as the web bell).
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }, [fetchNotifications])
  );

  useEffect(() => { if (!authLoading && !user) setLoading(false); }, [authLoading, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleOpen = async (n) => {
    const dest = getDestination(n);
    if (!n.read) {
      try {
        await API.put(`/notifications/${n._id}/read`);
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        showToast(errorMessage(err, 'Could not mark the notification as read.'), 'error');
        return;
      }
    }
    if (dest) router.push(dest);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      showToast(errorMessage(err, 'Could not mark all as read.'), 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  if (authLoading) return <Screen><Loading /></Screen>;

  if (!user) {
    return (
      <Screen>
        <EmptyState
          icon={LogIn}
          title="Sign in to see notifications"
          message="Approvals, comments and new activity on your posts will show up here."
          action="Sign in"
          onAction={() => router.push('/login')}
        />
      </Screen>
    );
  }

  const header = (
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
      <Row gap={8}>
        <T variant="h3">Recent activity</T>
        {unreadCount > 0 ? <Chip label={`${unreadCount} new`} tone={TONES.brand} style={{ paddingVertical: 2, paddingHorizontal: 10 }} /> : null}
      </Row>
      {unreadCount > 0 ? (
        <Pressable
          onPress={handleMarkAllRead}
          disabled={markingAll}
          accessibilityRole="button"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: markingAll ? 0.5 : 1 }}
        >
          <CheckCheck size={16} color={colors.pine} />
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.pine }}>Mark all read</T>
        </Pressable>
      ) : null}
    </Row>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications' }} />
      {loading ? (
        <Loading />
      ) : error && notifications.length === 0 ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); fetchNotifications(); }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n._id}
          ListHeaderComponent={header}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 48 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.sand, marginLeft: 68 }} />}
          ListEmptyComponent={
            <EmptyState
              icon={BellOff}
              title="You're all caught up"
              message="New activity on your posts will show up here."
            />
          }
          renderItem={({ item: n }) => {
            const { Icon, tone } = getIcon(n.type);
            return (
              <Pressable
                onPress={() => handleOpen(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? colors.paperDeep : n.read ? 'transparent' : 'rgba(251,233,230,0.6)',
                })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={tone.fg} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T style={{ fontFamily: n.read ? fonts.medium : fonts.semibold, fontSize: 15, lineHeight: 20, color: n.read ? colors.inkSoft : colors.ink }}>
                    {n.title}
                  </T>
                  {n.message ? <T variant="small">{n.message}</T> : null}
                  <T variant="caption" accessibilityLabel={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</T>
                </View>
                {!n.read ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}
