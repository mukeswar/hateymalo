import React, { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  BookOpen,
  BookOpenText,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  FolderKanban,
  Globe,
  HandCoins,
  ImageOff,
  LayoutTemplate,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Receipt,
  ReceiptText,
  Settings,
  ShieldAlert,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react-native';
import API from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_GROUPS, canAccessSection } from '../../lib/adminAccess';
import { formatDate, formatNPR, formatNumber } from '../../lib/format';
import { Avatar, Button, Card, Divider, EmptyState, Row, Screen, Skeleton, StatusChip, T } from '../../components/ui';
import { colors, fonts, radius, space } from '../../theme';

// Icon names in adminAccess.js → lucide components.
const ICONS = {
  Clock,
  FileText,
  BookOpen,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Megaphone,
  Users,
  Building2,
  UserPlus,
  FolderKanban,
  HandCoins,
  Target,
  Receipt,
  ShieldAlert,
  Settings,
  Lock,
  LayoutTemplate,
  TrendingUp,
  ReceiptText,
  BookOpenText,
};

const CHART_COLORS = ['#B5232C', '#1E5A47', '#E9A23B', '#2F5D8A', '#6B6157', '#8E1A22'];

const TONES = {
  brand: { bg: colors.brandTint, fg: colors.brand },
  pine: { bg: colors.pineTint, fg: colors.pine },
  sky: { bg: colors.skyTint, fg: colors.sky },
  marigold: { bg: colors.marigoldTint, fg: colors.marigoldText },
  plain: { bg: colors.paperDeep, fg: colors.inkSoft },
};

const KpiTile = ({ label, value, hint, icon: Icon, tone, hintColor = colors.muted, wide }) => (
  <Card style={{ width: wide ? '100%' : '48%', flexGrow: 1, gap: 6, padding: space.md }}>
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <T variant="small" style={{ flex: 1, fontFamily: fonts.medium }}>{label}</T>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} color={tone.fg} />
      </View>
    </Row>
    <T variant="h1" style={{ fontFamily: fonts.displayBold }} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
    <T variant="caption" style={{ color: hintColor, fontFamily: fonts.semibold }}>{hint}</T>
  </Card>
);

// Member growth as simple bars (the web uses a Recharts area chart).
const GrowthBars = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.val));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }} accessibilityLabel="Member growth chart">
        {data.map((d) => (
          <View key={d.date} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            {data.length <= 10 ? <T variant="caption" style={{ fontSize: 11 }}>{d.val}</T> : null}
            <View
              style={{
                width: '100%',
                maxWidth: 36,
                height: `${Math.max(4, (d.val / max) * 85)}%`,
                backgroundColor: colors.brand,
                opacity: 0.85,
                borderTopLeftRadius: 6,
                borderTopRightRadius: 6,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: colors.sand }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption">{data[0]?.date}</T>
        {data.length > 1 ? <T variant="caption">{data[data.length - 1]?.date}</T> : null}
      </Row>
    </View>
  );
};

const CategoryBars = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ gap: 10 }}>
      {data.map((item) => (
        <View key={item.name} style={{ gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8} style={{ flex: 1 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
              <T variant="small" style={{ color: colors.inkSoft, flex: 1 }} numberOfLines={1}>{item.name}</T>
            </Row>
            <T variant="semibold" style={{ fontSize: 14 }}>{item.value}</T>
          </Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.paperDeep, overflow: 'hidden' }}>
            <View style={{ width: `${(item.value / max) * 100}%`, height: '100%', backgroundColor: item.color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Admin hub — SuperAdminDashboard "Overview" tab + its sidebar of sections.
export default function AdminHome() {
  const auth = useAuth();
  const { user, can, isSuperAdmin, logout } = auth;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeActivities: 0,
    upcomingEvents: 0,
    pendingApprovals: 0,
    totalDonationsAmount: 0,
    pendingReports: 0,
    pendingBlogs: 0,
    verifiedUsers: 0,
  });
  const [growth, setGrowth] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [recent, setRecent] = useState([]);
  const canRef = useRef(can);
  canRef.current = can;

  const load = useCallback(async () => {
    const allowed = canRef.current;
    // Each source loads independently and only when this staff member may see it (as on the web).
    const skip = Promise.resolve(null);
    const safe = (p) => p.catch(() => null);
    const [analyticsRes, postsRes, reportsRes, adminStatsRes] = await Promise.all([
      safe(API.get('/super-admin/analytics?timeRange=30_DAYS')),
      safe(API.get('/posts?status=ALL')),
      allowed('canManageReports') ? safe(API.get('/reports')) : skip,
      safe(API.get('/admin/stats')),
    ]);

    if (analyticsRes?.data?.success) {
      const s = analyticsRes.data.data.summary;
      const c = analyticsRes.data.data.charts;
      setStats((prev) => ({
        ...prev,
        totalMembers: s.totalUsers || 0,
        activeActivities: s.activeActivities || 0,
        upcomingEvents: s.upcomingEvents || 0,
        pendingApprovals: s.pendingPosts || 0,
        totalDonationsAmount: s.totalDonationsAmount || 0,
      }));
      setGrowth(c.userGrowth?.length ? c.userGrowth.map((u) => ({ date: u.date, val: u.count })) : [{ date: 'Today', val: s.totalUsers || 0 }]);
      setByCategory(
        (c.postsByCategory || []).map((item, idx) => ({ name: item.category, value: item.count, color: CHART_COLORS[idx % CHART_COLORS.length] }))
      );
    }
    if (postsRes?.data?.success) setRecent(postsRes.data.data.slice(0, 5));
    if (reportsRes?.data?.success) setStats((prev) => ({ ...prev, pendingReports: reportsRes.data.count || 0 }));
    if (adminStatsRes?.data?.success) {
      const a = adminStatsRes.data.data;
      setStats((prev) => ({ ...prev, pendingBlogs: a.pendingBlogs || 0, verifiedUsers: a.verifiedUsers || 0 }));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Reload whenever the hub comes back into view (the web polls every 8 s).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const access = (id) => {
    const item = ADMIN_GROUPS.flatMap((g) => g.items).find((i) => i.id === id);
    return item ? canAccessSection(item.need, auth) : false;
  };

  const badges = {
    approval: { count: stats.pendingApprovals + (can('canApprovePosts') ? stats.pendingBlogs : 0), tone: TONES.marigold },
    reports: { count: stats.pendingReports, tone: { bg: colors.brand, fg: colors.white } },
  };

  const quickActions = [
    { label: 'Create announcement', icon: Megaphone, tone: TONES.brand, href: '/admin/announcements', allowed: can('canSendNotifications') },
    { label: 'Create event', icon: Calendar, tone: TONES.sky, href: '/admin/events?create=1', allowed: can('canManageEvents') },
    { label: 'Add new staff', icon: UserPlus, tone: TONES.pine, href: '/admin/admins', allowed: isSuperAdmin },
    { label: 'Manage categories', icon: FolderKanban, tone: TONES.marigold, href: '/admin/categories?create=1', allowed: can('canManageCategories') },
    { label: 'Launch campaign', icon: HandCoins, tone: TONES.pine, href: '/admin/campaigns', allowed: can('canManageDonations') },
    { label: 'Platform settings', icon: Settings, tone: TONES.plain, href: '/admin/settings', allowed: isSuperAdmin },
    { label: 'Review queue', icon: Clock, tone: TONES.marigold, href: '/admin/approval', allowed: can('canApprovePosts') && !isSuperAdmin },
    { label: 'Open reports', icon: AlertTriangle, tone: TONES.brand, href: '/admin/reports', allowed: can('canManageReports') && !isSuperAdmin },
  ].filter((qa) => qa.allowed);

  const groups = ADMIN_GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => canAccessSection(it.need, auth)) })).filter((g) => g.items.length > 0);
  const roleLabel = isSuperAdmin ? 'Super admin' : user?.role === 'ADMIN' ? 'Admin' : 'Moderator';

  const signOut = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Command center' }} />

      {/* Greeting */}
      <View style={{ gap: 4 }}>
        <T variant="eyebrowDeva">नमस्ते · {roleLabel}</T>
        <T variant="h1">Namaste, {user?.name?.split(' ')[0] || 'Admin'}</T>
        <T variant="small">
          Here's what's happening on हातेमालो today · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </T>
      </View>

      {/* Key stats */}
      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={112} width="48%" radius={radius.card} style={{ flexGrow: 1 }} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <KpiTile label="Total members" value={formatNumber(stats.totalMembers)} hint={`${formatNumber(stats.verifiedUsers)} verified`} icon={Users} tone={TONES.brand} />
          <KpiTile label="Active activities" value={formatNumber(stats.activeActivities)} hint="Approved & live" hintColor={colors.pine} icon={FolderKanban} tone={TONES.pine} />
          <KpiTile label="Upcoming events" value={formatNumber(stats.upcomingEvents)} hint="Official events" icon={Calendar} tone={TONES.sky} />
          <KpiTile label="Pending approvals" value={formatNumber(stats.pendingApprovals)} hint={stats.pendingBlogs ? `+ ${stats.pendingBlogs} blog${stats.pendingBlogs === 1 ? '' : 's'}` : 'Review queue'} hintColor={colors.marigoldText} icon={Clock} tone={TONES.marigold} />
          {can('canViewDonations') ? (
            <KpiTile label="Total donations" value={formatNPR(stats.totalDonationsAmount)} hint="Voluntary funds" hintColor={colors.pine} icon={HandCoins} tone={TONES.pine} wide />
          ) : null}
        </View>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 ? (
        <Card style={{ gap: space.md }}>
          <T variant="h3">Quick actions</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {quickActions.map((qa) => {
              const QIcon = qa.icon;
              return (
                <Pressable
                  key={qa.label}
                  onPress={() => router.push(qa.href)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    width: '31%',
                    flexGrow: 1,
                    minHeight: 92,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: space.sm,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.sand,
                    backgroundColor: pressed ? colors.paper : colors.white,
                  })}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: qa.tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <QIcon size={18} color={qa.tone.fg} />
                  </View>
                  <T variant="semibold" style={{ fontSize: 13, lineHeight: 16, textAlign: 'center' }}>{qa.label}</T>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Sections */}
      {groups.map((g) => (
        <View key={g.label} style={{ gap: 8 }}>
          <T variant="eyebrow" style={{ color: colors.muted }}>{g.label}</T>
          <Card padded={false}>
            {g.items.map((item, i) => {
              const Icon = ICONS[item.icon] || FileText;
              const badge = badges[item.id];
              return (
                <View key={item.id}>
                  {i > 0 ? <Divider style={{ marginLeft: 62 }} /> : null}
                  <Pressable
                    onPress={() => router.push(`/admin/${item.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={badge?.count ? `${item.label}, ${badge.count} pending` : item.label}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingHorizontal: space.lg,
                      minHeight: 56,
                      backgroundColor: pressed ? colors.paper : 'transparent',
                    })}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={colors.inkSoft} />
                    </View>
                    <T variant="medium" style={{ flex: 1 }}>{item.label}</T>
                    {badge?.count > 0 ? (
                      <View style={{ minWidth: 24, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: badge.tone.bg, alignItems: 'center' }}>
                        <T style={{ fontFamily: fonts.bold, fontSize: 12.5, color: badge.tone.fg }}>{badge.count}</T>
                      </View>
                    ) : null}
                    <ChevronRight size={18} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </View>
      ))}

      {/* Charts */}
      <Card style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T variant="h3">Member growth</T>
          <T variant="caption">Last 30 days</T>
        </Row>
        {loading ? <Skeleton height={140} /> : <GrowthBars data={growth} />}
      </Card>

      <Card style={{ gap: space.md }}>
        <T variant="h3">Activities by category</T>
        {loading ? (
          <Skeleton height={120} />
        ) : byCategory.length > 0 ? (
          <CategoryBars data={byCategory} />
        ) : (
          <EmptyState icon={FolderKanban} title="No posts yet" message="No posts in any category yet." style={{ paddingVertical: space.lg }} />
        )}
      </Card>

      {/* Recent activities */}
      <Card style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="h3">Recent activities</T>
          {access('posts') ? (
            <Pressable onPress={() => router.push('/admin/posts')} hitSlop={8} accessibilityRole="button">
              <T variant="semibold" style={{ color: colors.brand, fontSize: 14.5 }}>View all</T>
            </Pressable>
          ) : null}
        </Row>
        {recent.length > 0 ? (
          recent.map((act, i) => (
            <View key={act._id}>
              {i > 0 ? <Divider /> : null}
              <Pressable onPress={() => router.push(`/post/${act._id}`)} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                {act.images?.[0] ? (
                  <Image source={{ uri: act.images[0] }} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.paperDeep }} contentFit="cover" />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' }}>
                    <ImageOff size={16} color={colors.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <T variant="semibold" style={{ fontSize: 14.5 }} numberOfLines={1}>{act.title}</T>
                  <T variant="caption" numberOfLines={1}>{act.category} · {act.location || formatDate(act.createdAt)}</T>
                </View>
                <StatusChip status={act.status} />
              </Pressable>
            </View>
          ))
        ) : (
          <T variant="small" style={{ paddingVertical: space.md }}>{loading ? 'Loading…' : 'No posts have been submitted yet.'}</T>
        )}
      </Card>

      {/* Profile + exits */}
      <Card style={{ gap: space.md }}>
        <Row gap={12}>
          <Avatar name={user?.name || 'Admin'} src={user?.profilePicture} size="md" />
          <View style={{ flex: 1 }}>
            <T variant="semibold" numberOfLines={1}>{user?.name}</T>
            <T variant="caption">{user?.role}</T>
          </View>
        </Row>
        <Row gap={8}>
          <Button title="View app" variant="ghost" size="sm" icon={Globe} onPress={() => router.replace('/')} style={{ flex: 1 }} />
          <Button title="Log out" variant="danger" size="sm" icon={LogOut} onPress={signOut} style={{ flex: 1 }} />
        </Row>
      </Card>
    </Screen>
  );
}
