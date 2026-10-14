import React, { useCallback, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  BookOpen,
  Building2,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  Handshake,
  Heart,
  Info,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Mail,
  PenLine,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  CalendarDays,
  ScrollText,
} from 'lucide-react-native';
import API from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { canAccessSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { colors, fonts, radius } from '../../theme';
import { Avatar, Button, Card, Field, Row, Screen, T, VerificationBadge } from '../../components/ui';

// Hub that replaces the website's Navbar account menu, mobile menu and Footer links.
const MenuRow = ({ icon: Icon, label, hint, onPress, tint = colors.inkSoft, badge, last, labelColor }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={badge ? `${label}, ${badge} unread` : label}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      backgroundColor: pressed ? colors.paperDeep : 'transparent',
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: colors.sand,
    })}
  >
    <Icon size={20} color={tint} />
    <View style={{ flex: 1 }}>
      <T style={{ fontFamily: fonts.semibold, fontSize: 15.5, color: labelColor || colors.ink }}>{label}</T>
      {hint ? <T variant="caption">{hint}</T> : null}
    </View>
    {badge ? (
      <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14, color: colors.white }}>{badge > 99 ? '99+' : badge}</T>
      </View>
    ) : null}
    <ChevronRight size={18} color={colors.muted} />
  </Pressable>
);

const Group = ({ title, rows }) => {
  const visible = rows.filter(Boolean);
  if (!visible.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {title ? <T variant="eyebrow" style={{ color: colors.muted, marginLeft: 4 }}>{title}</T> : null}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {visible.map((r, i) => <MenuRow key={r.label} {...r} last={i === visible.length - 1} />)}
      </Card>
    </View>
  );
};

export default function Account() {
  const auth = useAuth();
  const { user, isAuthenticated, isAdmin, logout } = auth;
  const { settings } = useSettings();
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState('');

  const donationsOn = settings?.allowPublicDonations !== false;
  const registrationsOn = settings?.allowRegistrations !== false;
  const email = settings?.contactEmail || 'support@hateymalo.com';

  useFocusEffect(
    useCallback(() => {
      if (!user) { setUnread(0); return undefined; }
      let alive = true;
      API.get('/notifications')
        .then((res) => { if (alive && res.data?.success) setUnread(res.data.unreadCount || 0); })
        .catch(() => {});
      return () => { alive = false; };
    }, [user])
  );

  const go = (href) => () => router.push(href);

  const handleSearch = () => {
    const q = query.trim();
    router.push(q ? `/search?query=${encodeURIComponent(q)}` : '/search');
  };

  const handleLogout = async () => {
    const ok = await confirm('Log out?', 'You will need to sign in again to post or join drives.', { confirmText: 'Log out' });
    if (!ok) return;
    await logout();
    router.replace('/');
  };

  const openEmail = () => Linking.openURL(`mailto:${email}`).catch(() => {});

  return (
    <Screen edges={[]}>
      {isAuthenticated ? (
        <Card style={{ gap: 14 }}>
          <Row gap={14}>
            <Avatar name={user?.name} src={user?.profilePicture} size="lg" />
            <View style={{ flex: 1, gap: 3 }}>
              <T variant="h2" numberOfLines={1}>{user?.name}</T>
              <T variant="small" numberOfLines={1}>{user?.email}</T>
              <VerificationBadge level={isAdmin ? user?.role : user?.memberLevel} isVerified={user?.isVerified} />
            </View>
          </Row>
          <Button title="Ask or offer help" icon={Plus} full onPress={go('/create-post')} />
        </Card>
      ) : (
        <Card style={{ gap: 12, backgroundColor: colors.paperDeep }}>
          <T variant="eyebrowDeva">हातेमालोमा स्वागत छ</T>
          <T variant="h1">Join the community</T>
          <T variant="body">Ask for help, offer your time, and join drives near you.</T>
          <Row gap={10}>
            <Button title="Log in" variant="ghost" icon={LogIn} onPress={go('/login')} style={{ flex: 1 }} />
            {registrationsOn ? (
              <Button title="Join Hateymalo" icon={UserPlus} onPress={go('/register')} style={{ flex: 1 }} />
            ) : null}
          </Row>
          {!registrationsOn ? <T variant="small">New sign-ups are paused by the administrators.</T> : null}
        </Card>
      )}

      <Field
        value={query}
        onChangeText={setQuery}
        placeholder="Search people, causes, events…"
        returnKeyType="search"
        onSubmitEditing={handleSearch}
        accessibilityLabel="Search Hateymalo"
        right={
          <Pressable onPress={handleSearch} hitSlop={8} accessibilityLabel="Search">
            <Search size={18} color={colors.muted} />
          </Pressable>
        }
      />

      {isAuthenticated && isAdmin ? (
        <Group
          title="Staff"
          rows={[
            { icon: ShieldAlert, label: 'Admin command center', tint: colors.brand, labelColor: colors.brand, onPress: go('/admin') },
            canAccessSection('canApprovePosts', auth)
              ? { icon: ShieldCheck, label: 'Moderation queue', tint: colors.marigoldText, onPress: go('/admin/approval') }
              : null,
          ]}
        />
      ) : null}

      {isAuthenticated ? (
        <Group
          title="You"
          rows={[
            { icon: LayoutDashboard, label: 'My dashboard', tint: colors.pine, onPress: go('/dashboard') },
            { icon: User, label: 'My profile', tint: colors.sky, onPress: go(`/profile/${user?._id}`) },
            { icon: Bell, label: 'Notifications', tint: colors.brand, badge: unread || null, onPress: go('/notifications') },
            { icon: Plus, label: 'Ask or offer help', hint: 'Create a help request or offer', tint: colors.brand, onPress: go('/create-post') },
            { icon: PenLine, label: 'Write a story', tint: colors.marigoldText, onPress: go('/create-blog') },
          ]}
        />
      ) : null}

      {donationsOn ? (
        <Button title="Support a cause" icon={Heart} variant="pine" size="lg" full onPress={go('/donate')} />
      ) : null}

      <Group
        title="Get involved"
        rows={[
          { icon: Compass, label: 'Help requests', tint: colors.brand, onPress: () => router.push('/explore') },
          { icon: LayoutGrid, label: 'Causes', hint: 'Browse by category', tint: colors.brand, onPress: go('/categories') },
          { icon: CalendarDays, label: 'Events', tint: colors.brand, onPress: () => router.push('/events') },
          { icon: Handshake, label: 'Sponsor a campaign', hint: 'For companies, NGOs and businesses', tint: colors.pine, onPress: go('/sponsor') },
          isAuthenticated ? { icon: BriefcaseBusiness, label: 'Sponsor portal', hint: 'Your sponsor accounts and deals', tint: colors.pine, onPress: go('/sponsor/portal') } : null,
        ]}
      />

      <Group
        title="Community"
        rows={[
          { icon: BookOpen, label: 'Stories', tint: colors.brand, onPress: () => router.push('/blogs') },
          { icon: Building2, label: 'Organizations', tint: colors.brand, onPress: go('/organizations') },
          { icon: Users, label: 'Members', tint: colors.brand, onPress: go('/members') },
          { icon: Search, label: 'Search', tint: colors.brand, onPress: go('/search') },
        ]}
      />

      <Group
        title="About"
        rows={[
          { icon: Info, label: 'Our mission', tint: colors.inkSoft, onPress: go('/about') },
          { icon: ScrollText, label: 'Community guidelines', tint: colors.inkSoft, onPress: go('/about?section=guidelines') },
          donationsOn ? { icon: Heart, label: 'Transparency', hint: 'Where donations go', tint: colors.pine, onPress: go('/donate') } : null,
        ]}
      />

      <View style={{ backgroundColor: colors.night, borderRadius: radius.card, padding: 18, gap: 10 }}>
        <T style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.white }}>Questions, partnerships or a safety concern?</T>
        <T variant="small" style={{ color: '#B5AB9E' }}>We read every message.</T>
        <Pressable
          onPress={openEmail}
          accessibilityRole="link"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}
        >
          <Mail size={16} color={colors.ink} />
          <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{email}</T>
        </Pressable>
        <T variant="h3" style={{ color: 'rgba(255,255,255,0.9)', marginTop: 4 }}>
          {settings?.tagline || 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।'}
        </T>
        <T variant="caption" style={{ color: '#9C9286' }}>
          © {new Date().getFullYear()} Hateymalo (हातेमालो). Built for community collaboration in Nepal.
        </T>
      </View>

      {isAuthenticated ? (
        <Button title="Log out" icon={LogOut} variant="danger" full onPress={handleLogout} />
      ) : null}
    </Screen>
  );
}
