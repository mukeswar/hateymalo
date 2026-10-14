import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  FileText,
  Flag,
  GraduationCap,
  HandHeart,
  HandHelping,
  HeartHandshake,
  Info,
  MapPin,
  Megaphone,
  Minus,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Trash2,
  Trees,
  Users,
} from 'lucide-react-native';
import API from '../../lib/api';
import { formatNumber, plainText } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import PostCard from '../../components/PostCard';
import { Avatar, Button, Card, Chip, ProgressBar, Row, Skeleton, T, VerificationBadge } from '../../components/ui';
import { colors, fonts, radius, shadow, space } from '../../theme';

// Port of frontend/src/pages/Home.jsx. Decorative web motion (parallax, tilt,
// count-up, layered stock photos) is dropped; every content section is kept.
const LOGO = require('../../../assets/logo-mark.png');

// The CMS default hero image predates the redesign; the web only uses the CMS value when an admin changed it.
const LEGACY_DEFAULT_HERO = 'photo-1593113598332';
const FALLBACK_HERO = 'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1200&q=75';
const FALLBACK_STORY = 'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=700&q=75';

const npr = (n) => `रु ${Number(n || 0).toLocaleString('en-IN')}`;

const CATEGORY_ICONS = {
  HeartHandshake, BookOpen, GraduationCap, FileText, Sparkles, Trash2, Trees, Users, Smile, Megaphone, Briefcase, MoreHorizontal,
};

const FAQS = [
  {
    q: 'Is Hateymalo free to use?',
    a: 'Yes. Creating an account, asking for help, offering help, joining activities and registering an organisation are all free. Donations are always voluntary.',
  },
  {
    q: 'How do you keep posts genuine and safe?',
    a: 'Every help request is reviewed by a moderator before it goes public. Posts that are commercial, misleading or unsafe are rejected with a reason, and anyone can report a post, comment or profile for review.',
  },
  {
    q: 'Can I organise a drive or event in my own town or village?',
    a: 'Yes. Any registered member can post a help request or community activity anywhere in Nepal — a clean-up, tutoring, a blood donation camp, relief collection, and more.',
  },
  {
    q: 'What do member levels and badges mean?',
    a: 'As you take part, your profile shows your contribution: members grow from New Member to Trusted and Verified Member, and earn badges for the kind of help they give. Verified accounts are checked by the Hateymalo team.',
  },
  {
    q: 'How can an NGO or community group get verified?',
    a: 'Register as an organisation with your official details. Once the Hateymalo team verifies them, your profile shows a verified badge and appears in the organisation directory.',
  },
];

const TRUST = [
  { icon: ShieldCheck, title: 'Moderated before it goes live', body: 'Every help request and story is reviewed by a moderator first.' },
  { icon: BadgeCheck, title: 'Verified organisations', body: 'NGOs and groups are checked by the Hateymalo team before they get a verified badge.' },
  { icon: ReceiptText, title: 'Open expense ledgers', body: 'Campaigns publish what was spent and on what, for anyone to read.' },
  { icon: Flag, title: 'Report anything that feels wrong', body: 'Any post, comment or profile can be reported and is looked at by our team.' },
];

const Section = ({ eyebrow, title, intro, action, onAction, children, style }) => (
  <View style={[{ gap: space.lg, paddingHorizontal: space.lg }, style]}>
    <View style={{ gap: 6 }}>
      {eyebrow ? <T variant="eyebrowDeva">{eyebrow}</T> : null}
      <T variant="h1">{title}</T>
      {intro ? <T style={{ color: colors.muted }}>{intro}</T> : null}
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link" style={styles.viewAll}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.brand }}>{action}</T>
          <ArrowRight size={16} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
    {children}
  </View>
);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { settings, refreshSettings } = useSettings();
  const { isAuthenticated } = useAuth();
  const donationsOn = settings?.allowPublicDonations !== false;

  const [latestPosts, setLatestPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [latestBlogs, setLatestBlogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [unread, setUnread] = useState(0);

  const fetchData = useCallback(async () => {
    const safe = (p) => p.catch(() => null);
    try {
      const [postsRes, featuredRes, eventsRes, blogsRes, annRes, statsRes, campaignsRes, orgsRes, catRes] = await Promise.all([
        safe(API.get('/posts?sort=newest')),
        safe(API.get('/posts?featured=true')),
        safe(API.get('/events?status=UPCOMING')),
        safe(API.get('/blogs')),
        safe(API.get('/announcements')),
        safe(API.get('/stats')),
        safe(API.get('/donations/campaigns')),
        safe(API.get('/search?entityType=ORGANIZATIONS')),
        safe(API.get('/categories?activeOnly=true')),
      ]);
      if (postsRes?.data.success) setLatestPosts(postsRes.data.data);
      if (featuredRes?.data.success) setFeaturedPosts(featuredRes.data.data);
      if (eventsRes?.data.success) setUpcomingEvents(eventsRes.data.data.slice(0, 3));
      if (blogsRes?.data.success) setLatestBlogs(blogsRes.data.data.slice(0, 3));
      if (annRes?.data.success) setAnnouncements(annRes.data.data);
      if (statsRes?.data.success) setStats(statsRes.data.data);
      if (campaignsRes?.data.success) setCampaigns(campaignsRes.data.data.filter((c) => c.status === 'ACTIVE').slice(0, 3));
      if (orgsRes?.data.success) setOrganizations((orgsRes.data.data.organizations || []).slice(0, 4));
      if (catRes?.data.success) setCategories(catRes.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unread badge on the bell, refreshed whenever Home regains focus.
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        setUnread(0);
        return;
      }
      API.get('/notifications')
        .then((res) => setUnread(res.data?.unreadCount || 0))
        .catch(() => {});
    }, [isAuthenticated])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshSettings()]);
    setRefreshing(false);
  };

  // Admin-featured posts first, then the newest ones, without duplicates.
  const openRequests = [...featuredPosts, ...latestPosts.filter((p) => !featuredPosts.some((f) => f._id === p._id))].slice(0, 6);

  const recentPeople = [];
  latestPosts.forEach((p) => {
    if (p.creator && !recentPeople.some((x) => x._id === p.creator._id)) recentPeople.push(p.creator);
  });

  const heroImage = settings?.heroImage && !settings.heroImage.includes(LEGACY_DEFAULT_HERO) ? settings.heroImage : FALLBACK_HERO;
  const heroLines = (settings?.heroHeadline || 'मद्दत मागौँ।\nसहयोग गरौँ।\nसँगै परिवर्तन ल्याऔँ।')
    .split('\n')
    // Same as the web's /\n|(?<=।)\s+/ split, without regex lookbehind.
    .flatMap((l) => l.split(/।\s+/).map((part, i, arr) => (i < arr.length - 1 ? `${part}।` : part)))
    .map((l) => l.trim())
    .filter(Boolean);
  const latestActivity = latestPosts[0];

  const impact = [
    { label: 'Community members', ne: 'सदस्य', value: stats?.totalMembers, icon: Users, tone: colors.ink },
    { label: 'Helpers who joined a drive', ne: 'सहयोगी', value: stats?.peopleConnected, icon: HandHelping, tone: colors.brand },
    { label: 'Activities organised', ne: 'गतिविधि', value: stats?.totalActivities, icon: Sparkles, tone: colors.marigoldText },
    { label: 'Places reached', ne: 'स्थान', value: stats?.communitiesReached, icon: MapPin, tone: colors.pine },
  ];

  const ways = [
    {
      icon: HandHelping,
      ne: 'मद्दत माग्नुहोस्',
      title: 'Ask for help',
      body: 'Share what you or your community needs. A moderator reviews it, then people nearby can offer support.',
      to: isAuthenticated ? '/create-post' : '/register',
      cta: 'Post a request',
      tone: { bg: colors.brandTint, fg: colors.brand },
    },
    {
      icon: HandHeart,
      ne: 'सहयोग गर्नुहोस्',
      title: 'Offer your time & skills',
      body: 'Browse open requests and activities — tutoring, clean-ups, relief drives — and join the ones that move you.',
      to: '/explore',
      cta: 'Browse requests',
      tone: { bg: colors.pineTint, fg: colors.pine },
    },
    donationsOn
      ? {
          icon: HeartHandshake,
          ne: 'योगदान दिनुहोस्',
          title: 'Give to a cause',
          body: 'Support verified campaigns with full expense ledgers, so you can see exactly where every rupee goes.',
          to: '/donate',
          cta: 'See campaigns',
          tone: { bg: colors.marigoldTint, fg: colors.marigoldText },
        }
      : {
          icon: CalendarDays,
          ne: 'कार्यक्रममा सहभागी हुनुहोस्',
          title: 'Join an event',
          body: 'Meet your neighbours at clean-ups, health camps and community gatherings near you.',
          to: '/events',
          cta: 'See events',
          tone: { bg: colors.marigoldTint, fg: colors.marigoldText },
        },
  ];

  const quickLinks = [
    { label: 'Events', icon: CalendarDays, to: '/events' },
    { label: 'Stories', icon: BookOpen, to: '/blogs' },
    { label: 'Members', icon: Users, to: '/members' },
    { label: 'Organisations', icon: Building2, to: '/organizations' },
    { label: 'Causes', icon: Sparkles, to: '/categories' },
    ...(donationsOn ? [{ label: 'Donate', icon: HeartHandshake, to: '/donate' }] : []),
    { label: 'About', icon: Info, to: '/about' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Row gap={10} style={{ flex: 1 }}>
          <Image source={LOGO} style={{ width: 34, height: 34 }} contentFit="contain" accessibilityLabel="Hateymalo" />
          <T style={{ fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink }}>हातेमालो</T>
        </Row>
        <Pressable onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel="Search" style={styles.iconBtn}>
          <Search size={20} color={colors.ink} />
        </Pressable>
        {isAuthenticated ? (
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            style={styles.iconBtn}
          >
            <Bell size={20} color={colors.ink} />
            {unread > 0 ? (
              <View style={styles.badge}>
                <T style={{ fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, color: colors.white }}>{unread > 9 ? '9+' : unread}</T>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <Button title="Sign in" size="sm" variant="ghost" onPress={() => router.push('/login')} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl * 2, gap: space.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {/* Announcement */}
        {announcements.length > 0 ? (
          <View style={styles.announcement}>
            <Megaphone size={16} color={colors.marigoldText} />
            <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>
              <T style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 14 }}>{announcements[0].title}</T>
              {announcements[0].content ? ` — ${announcements[0].content}` : ''}
            </T>
          </View>
        ) : null}

        {/* Hero */}
        <View style={{ paddingHorizontal: space.lg, gap: space.lg, marginTop: announcements.length > 0 ? -space.lg : space.sm }}>
          <View style={styles.heroLabel}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pine }} />
            <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft }}>
              {settings?.heroSmallLabel || 'Together, we can make a difference'}
            </T>
          </View>
          <View>
            {heroLines.map((line, i) => (
              <T
                key={`${line}-${i}`}
                style={{
                  fontFamily: fonts.displayBold,
                  fontSize: 34,
                  lineHeight: 46,
                  color: i === heroLines.length - 1 ? colors.brand : colors.ink,
                }}
              >
                {line}
              </T>
            ))}
          </View>
          <T style={{ fontSize: 17, lineHeight: 26, color: colors.muted }}>
            {settings?.heroDescription ||
              'Hateymalo is a community platform where people can ask for help, offer their skills, join meaningful activities, and create positive change together.'}
          </T>
          <View style={{ gap: 10 }}>
            <Button title="I want to help" icon={HandHeart} size="lg" full onPress={() => router.push('/explore')} />
            <Button
              title="I need help"
              icon={HandHelping}
              size="lg"
              variant="ghost"
              full
              onPress={() => router.push(isAuthenticated ? '/create-post' : '/register')}
            />
          </View>

          <View style={styles.heroImage}>
            <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            {stats ? (
              <View style={styles.statChip}>
                <View style={styles.statIcon}>
                  <HeartHandshake size={20} color={colors.brand} />
                </View>
                <View>
                  <T style={{ fontFamily: fonts.displayBold, fontSize: 22, lineHeight: 26, color: colors.ink }}>{formatNumber(stats.peopleConnected)}</T>
                  <T variant="caption">helpers joined community drives</T>
                </View>
              </View>
            ) : null}
          </View>

          {recentPeople.length > 0 ? (
            <Row gap={12}>
              <View style={{ flexDirection: 'row' }}>
                {recentPeople.slice(0, 4).map((p, i) => (
                  <View key={p._id} style={[styles.ring, i > 0 && { marginLeft: -10 }]}>
                    <Avatar name={p.name} src={p.profilePicture} size="md" />
                  </View>
                ))}
              </View>
              <T variant="small" style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 14 }}>
                  {stats?.totalMembers ? `${stats.totalMembers.toLocaleString()} neighbours` : 'Neighbours'}
                </T>{' '}
                are already helping each other here.
              </T>
            </Row>
          ) : null}

          {latestActivity ? (
            <Card onPress={() => router.push(`/post/${latestActivity._id}`)} padded={false} style={{ padding: space.md }}>
              <Row gap={10}>
                <Chip label="Latest" tone={{ bg: colors.pineTint, fg: colors.pine }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T variant="semibold" style={{ fontSize: 14.5 }} numberOfLines={1}>{latestActivity.title}</T>
                  <T variant="caption" numberOfLines={1}>
                    {latestActivity.location} · {latestActivity.joinedUsers?.length || 0} joined
                  </T>
                </View>
                <ArrowUpRight size={16} color={colors.muted} />
              </Row>
            </Card>
          ) : null}
        </View>

        {/* Quick links */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space.lg }}>
          {quickLinks.map((l) => (
            <Pressable key={l.label} onPress={() => router.push(l.to)} accessibilityRole="link" style={styles.quick}>
              <l.icon size={20} color={colors.brand} />
              <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.ink }}>{l.label}</T>
            </Pressable>
          ))}
        </ScrollView>

        {/* Ways to take part */}
        <Section
          eyebrow="तपाईं कसरी जोडिन सक्नुहुन्छ"
          title="Every hand matters. Find yours."
          intro="Whether you have an hour, a skill, or simply need a neighbour — there is a place for you here."
        >
          {ways.map((w) => (
            <Card key={w.title} onPress={() => router.push(w.to)} style={{ gap: space.md }}>
              <View style={[styles.wayIcon, { backgroundColor: w.tone.bg }]}>
                <w.icon size={26} color={w.tone.fg} />
              </View>
              <View style={{ gap: 4 }}>
                <T variant="eyebrowDeva" style={{ color: colors.muted }}>{w.ne}</T>
                <T variant="h2">{w.title}</T>
                <T variant="small">{w.body}</T>
              </View>
              <Row gap={6}>
                <T variant="semibold" style={{ fontSize: 15 }}>{w.cta}</T>
                <ArrowRight size={16} color={colors.ink} />
              </Row>
            </Card>
          ))}
        </Section>

        {/* Impact */}
        <View style={styles.band}>
          <Section
            eyebrow="हाम्रो साझा प्रभाव"
            title="Small acts, adding up."
            intro="These numbers are live from the platform — every member, activity and helper counted here is real."
          >
            {donationsOn && stats?.totalDonations > 0 ? (
              <T variant="small" style={{ color: colors.inkSoft }}>
                <T style={{ fontFamily: fonts.displayBold, fontSize: 19, color: colors.pine }}>{npr(stats.totalDonations)}</T> given voluntarily so far,
                every rupee tracked in a public ledger.
              </T>
            ) : null}
            <View style={styles.grid2}>
              {impact.map((s) => (
                <View key={s.label} style={styles.impactTile}>
                  <s.icon size={22} color={s.tone} />
                  {stats ? (
                    <T style={{ fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, color: s.tone }}>{formatNumber(s.value)}</T>
                  ) : (
                    <Skeleton height={34} width={70} />
                  )}
                  <T variant="semibold" style={{ fontSize: 14 }}>{s.label}</T>
                  <T variant="caption">{s.ne}</T>
                </View>
              ))}
            </View>
          </Section>
        </View>

        {/* Causes */}
        {categories.length > 0 ? (
          <View style={{ gap: space.md }}>
            <View style={{ paddingHorizontal: space.lg, gap: 4 }}>
              <T variant="eyebrowDeva">सरोकारहरू</T>
              <T variant="h1">Browse by cause</T>
              <Pressable onPress={() => router.push('/categories')} hitSlop={8} style={styles.viewAll}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.brand }}>All causes</T>
                <ArrowRight size={16} color={colors.brand} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: space.lg }}>
              {categories.map((c) => {
                const Icon = CATEGORY_ICONS[c.icon] || HeartHandshake;
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => router.push({ pathname: '/explore', params: { category: c.name } })}
                    accessibilityRole="link"
                    style={styles.causeChip}
                  >
                    <Icon size={16} color={colors.brand} />
                    <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{c.name}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Open requests (featured first) */}
        <Section
          eyebrow="अहिले सहयोग चाहिएको"
          title="People near you, asking for a hand"
          intro="Every request here has been reviewed by a moderator. Join one, or simply show you're interested."
          action="See all requests"
          onAction={() => router.push('/explore')}
        >
          {loading ? (
            [0, 1].map((n) => <Skeleton key={n} height={330} radius={radius.card} />)
          ) : openRequests.length > 0 ? (
            openRequests.map((post) => <PostCard key={post._id} post={post} />)
          ) : (
            <Card style={{ alignItems: 'center', gap: 10 }}>
              <T variant="h2" style={{ textAlign: 'center' }}>No open requests right now.</T>
              <T variant="small" style={{ textAlign: 'center' }}>Be the first to start something in your community.</T>
              <Button title="Start a request" icon={Plus} onPress={() => router.push('/create-post')} />
            </Card>
          )}
        </Section>

        {/* Campaigns */}
        {donationsOn && campaigns.length > 0 ? (
          <View style={styles.pineBand}>
            <View style={{ gap: 6 }}>
              <T variant="eyebrowDeva" style={{ color: colors.marigold }}>पारदर्शी अभियान</T>
              <T variant="h1" style={{ color: colors.white }}>Campaigns you can see all the way through</T>
              <T style={{ color: 'rgba(255,255,255,0.78)' }}>Each campaign publishes its expenses, so supporters can follow exactly how funds are used.</T>
              <Pressable onPress={() => router.push('/donate')} hitSlop={8} style={styles.viewAll}>
                <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.white }}>All campaigns</T>
                <ArrowRight size={16} color={colors.white} />
              </Pressable>
            </View>
            {campaigns.map((c) => {
              const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
              return (
                <Pressable key={c._id} onPress={() => router.push('/donate')} accessibilityRole="link" style={styles.campaign}>
                  <Row gap={8}>
                    <Avatar name={c.creator?.name} src={c.creator?.profilePicture} size="xs" />
                    <T variant="caption" style={{ color: 'rgba(255,255,255,0.75)', flex: 1 }} numberOfLines={1}>{c.creator?.name}</T>
                  </Row>
                  <T variant="h3" style={{ color: colors.white }}>{c.title}</T>
                  <T variant="small" style={{ color: 'rgba(255,255,255,0.72)' }} numberOfLines={2}>{c.description}</T>
                  <ProgressBar value={pct} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ color: colors.white, fontSize: 14 }}>
                      <T style={{ fontFamily: fonts.display, fontSize: 17, color: colors.white }}>{npr(c.raisedAmount)}</T>
                      <T style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14 }}> of {npr(c.goalAmount)}</T>
                    </T>
                    <T style={{ fontFamily: fonts.semibold, color: colors.marigold, fontSize: 14 }}>{pct}%</T>
                  </Row>
                </Pressable>
              );
            })}
            <Button title="Give to a campaign" icon={HandHeart} variant="ghost" onPress={() => router.push('/donate')} />
          </View>
        ) : null}

        {/* Stories */}
        {latestBlogs.length > 0 ? (
          <Section
            eyebrow="समुदायका कथाहरू"
            title="Stories from the people doing the work"
            intro="Written by members and organisations about what they built together."
            action="Read all stories"
            onAction={() => router.push('/blogs')}
          >
            <Pressable onPress={() => router.push(`/blog/${latestBlogs[0]._id}`)} accessibilityRole="link" style={styles.storyHero}>
              <Image source={{ uri: latestBlogs[0].coverImage || FALLBACK_STORY }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, gap: 8 }}>
                <Chip label={latestBlogs[0].category || 'Story'} tone={{ bg: 'rgba(255,255,255,0.95)', fg: colors.ink }} />
                <T variant="h2" style={{ color: colors.white }}>{latestBlogs[0].title}</T>
                <T variant="small" style={{ color: 'rgba(255,255,255,0.82)' }} numberOfLines={2}>{plainText(latestBlogs[0].content, 200)}</T>
                <Row gap={8}>
                  <Avatar name={latestBlogs[0].author?.name} src={latestBlogs[0].author?.profilePicture} size="xs" />
                  <T variant="caption" style={{ color: colors.white }}>{latestBlogs[0].author?.name}</T>
                </Row>
              </View>
            </Pressable>
            {latestBlogs.slice(1).map((b) => (
              <Card key={b._id} onPress={() => router.push(`/blog/${b._id}`)} padded={false} style={{ padding: space.md }}>
                <Row gap={12} style={{ alignItems: 'center' }}>
                  <Image source={{ uri: b.coverImage || FALLBACK_STORY }} style={styles.storyThumb} contentFit="cover" />
                  <View style={{ flex: 1, gap: 4 }}>
                    <T variant="eyebrow">{b.category || 'Story'}</T>
                    <T variant="h3" numberOfLines={2}>{b.title}</T>
                    <T variant="small" numberOfLines={2}>{plainText(b.content, 140)}</T>
                  </View>
                </Row>
              </Card>
            ))}
          </Section>
        ) : null}

        {/* Events */}
        {upcomingEvents.length > 0 ? (
          <Section eyebrow="आगामी कार्यक्रम" title="Show up, meet your neighbours" action="All events" onAction={() => router.push('/events')}>
            {upcomingEvents.map((ev) => {
              const d = new Date(ev.date);
              const going = ev.joinedUsers?.length || 0;
              const capacity = ev.maxParticipants ? `${going} / ${ev.maxParticipants} going` : `${going} going`;
              return (
                <Card key={ev._id} onPress={() => router.push(`/event/${ev._id}`)} style={{ gap: 12 }}>
                  <Row gap={14} style={{ alignItems: 'flex-start' }}>
                    <View style={styles.dateTile}>
                      <T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.brand, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {d.toLocaleDateString('en-GB', { month: 'short' })}
                      </T>
                      <T style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 30, color: colors.ink }}>{d.getDate()}</T>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {ev.category ? <Chip label={ev.category} tone={{ bg: colors.skyTint, fg: colors.sky }} /> : null}
                      <T variant="h3">{ev.title}</T>
                      {ev.location ? (
                        <Row gap={6}>
                          <MapPin size={14} color={colors.muted} />
                          <T variant="small" style={{ flex: 1 }} numberOfLines={1}>{ev.location}</T>
                        </Row>
                      ) : null}
                      {ev.startTime ? (
                        <Row gap={6}>
                          <Clock size={14} color={colors.muted} />
                          <T variant="small">{ev.startTime}</T>
                        </Row>
                      ) : null}
                    </View>
                  </Row>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T variant="small">{capacity}</T>
                    <T style={{ fontFamily: fonts.semibold, fontSize: 14.5, color: colors.brand }}>View & join</T>
                  </Row>
                </Card>
              );
            })}
          </Section>
        ) : null}

        {/* Trust */}
        <Section
          eyebrow="विश्वासमा आधारित"
          title="Built on trust, not on hope"
          intro="Helping is easier when you know who you're working with. These safeguards are part of every request, campaign and profile."
        >
          {TRUST.map((t) => (
            <Row key={t.title} gap={14} style={{ alignItems: 'flex-start' }}>
              <View style={styles.trustIcon}>
                <t.icon size={20} color={colors.pine} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="semibold">{t.title}</T>
                <T variant="small">{t.body}</T>
              </View>
            </Row>
          ))}
        </Section>

        {/* Organisations */}
        <Section title="Organisations on Hateymalo" action="Directory" onAction={() => router.push('/organizations')}>
          {organizations.length > 0 ? (
            <>
              {organizations.map((org) => (
                <Card key={org._id} onPress={() => router.push(`/profile/${org._id}`)} style={{ gap: 10 }}>
                  <Row gap={12}>
                    <Avatar name={org.orgDetails?.orgName || org.name} src={org.profilePicture} size="lg" rounded={false} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T variant="semibold" numberOfLines={1}>{org.orgDetails?.orgName || org.name}</T>
                      <T variant="caption">{org.orgDetails?.orgType || 'Organisation'}</T>
                    </View>
                  </Row>
                  {org.orgDetails?.description || org.bio ? (
                    <T variant="small" numberOfLines={2}>{org.orgDetails?.description || org.bio}</T>
                  ) : null}
                  <Row style={{ justifyContent: 'space-between' }}>
                    {org.location ? (
                      <Row gap={4} style={{ flex: 1 }}>
                        <MapPin size={13} color={colors.muted} />
                        <T variant="caption" numberOfLines={1}>{org.location}</T>
                      </Row>
                    ) : <View />}
                    {org.isVerified ? <VerificationBadge level="ORGANIZATION" isVerified /> : null}
                  </Row>
                </Card>
              ))}
              <Pressable onPress={() => router.push('/register')} accessibilityRole="link" style={styles.dashed}>
                <Plus size={22} color={colors.pine} />
                <T variant="semibold" style={{ textAlign: 'center' }}>Run an NGO or community group?</T>
                <T variant="small" style={{ textAlign: 'center' }}>Register your organisation — it's free.</T>
              </Pressable>
            </>
          ) : (
            <Card style={{ alignItems: 'center', gap: 10 }}>
              <T variant="semibold">No organisations have joined yet.</T>
              <Button title="Register your organisation" variant="pine" size="sm" onPress={() => router.push('/register')} />
            </Card>
          )}
        </Section>

        {/* FAQ */}
        <Section eyebrow="प्रश्न र उत्तर" title="Questions people often ask">
          <View style={{ borderTopWidth: 1, borderTopColor: colors.sand }}>
            {FAQS.map((item, idx) => {
              const open = activeFaq === idx;
              return (
                <View key={item.q} style={{ borderBottomWidth: 1, borderBottomColor: colors.sand }}>
                  <Pressable
                    onPress={() => setActiveFaq(open ? -1 : idx)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    style={styles.faqQ}
                  >
                    <T variant="semibold" style={{ flex: 1, fontSize: 16.5 }}>{item.q}</T>
                    <View style={[styles.faqIcon, open && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
                      {open ? <Minus size={16} color={colors.white} /> : <Plus size={16} color={colors.ink} />}
                    </View>
                  </Pressable>
                  {open ? <T style={{ color: colors.muted, paddingBottom: space.lg, paddingRight: space.xl }}>{item.a}</T> : null}
                </View>
              );
            })}
          </View>
          <Button title="About Hateymalo" variant="text" iconRight={ArrowRight} onPress={() => router.push('/about')} style={{ alignSelf: 'flex-start' }} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingBottom: 10,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.sand,
  },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcement: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.marigoldTint, paddingHorizontal: space.lg, paddingVertical: 10 },
  heroLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroImage: { height: 260, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.paperDeep, ...shadow.lift },
  statChip: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadow.soft,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' },
  ring: { borderRadius: 999, borderWidth: 3, borderColor: colors.paper },
  quick: {
    width: 92,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
  wayIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  band: { backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.sand, paddingVertical: space.xxl },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  impactTile: { flexBasis: '46%', flexGrow: 1, backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: space.lg, gap: 6 },
  causeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pineBand: { backgroundColor: colors.pine, paddingHorizontal: space.lg, paddingVertical: space.xxl, gap: space.lg },
  campaign: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: radius.card, padding: space.lg, gap: 8 },
  storyHero: { height: 380, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.paperDeep },
  storyThumb: { width: 92, height: 92, borderRadius: 16, backgroundColor: colors.paperDeep },
  dateTile: { width: 64, alignItems: 'center', paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.paper },
  trustIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.pineTint, alignItems: 'center', justifyContent: 'center' },
  dashed: {
    minHeight: 140,
    borderRadius: radius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: space.lg,
  },
  faqQ: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: space.lg },
  faqIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
});
