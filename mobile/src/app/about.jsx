import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Flag,
  HandHelping,
  HeartHandshake,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  XCircle,
} from 'lucide-react-native';
import API from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatNumber } from '../lib/format';
import { colors, fonts, radius, shadow, space } from '../theme';
import { Button, Card, Row, Screen, T } from '../components/ui';

// Port of frontend/src/pages/About.jsx. Numbers come live from GET /stats only.
const PILLARS = [
  { icon: HandHelping, ne: 'मद्दत मागौँ', en: 'Ask for help', body: 'Anyone facing hardship, needing guidance or tutoring, or organising local aid can ask the community, safely and without fees.', tone: { bg: colors.brandTint, fg: colors.brand } },
  { icon: Users, ne: 'सहयोग गरौँ', en: 'Lend a hand', body: 'Neighbours and volunteers offer time and skills: mentoring, planting saplings, cleaning streets, showing up when it counts.', tone: { bg: colors.pineTint, fg: colors.pine } },
  { icon: Sprout, ne: 'सँगै परिवर्तन ल्याऔँ', en: 'Change things together', body: 'Small acts add up to cleaner neighbourhoods, supported students and a stronger habit of looking out for each other.', tone: { bg: colors.marigoldTint, fg: colors.marigoldText } },
];

const VALUES = [
  { icon: HeartHandshake, title: 'Dignity first', body: 'Asking for help is not a weakness. Requests are written and shown with respect, never as spectacle.' },
  { icon: ReceiptText, title: 'Open books', body: 'Campaigns publish their expenses with receipts so supporters can see exactly where money went.' },
  { icon: ShieldCheck, title: 'Safety by design', body: 'Posts are reviewed before they go public, and anyone can report something that feels wrong.' },
  { icon: MapPin, title: 'Locally led', body: 'The people closest to a problem usually know best how to solve it. We give them the tools.' },
];

const DO = [
  'Describe needs honestly and specifically, including where and when.',
  'Be kind in comments, even when you disagree.',
  "Protect privacy: ask before sharing anyone else's photo or details.",
  'Keep campaign spending documented with receipts.',
  'Meet in public places and tell someone where you are going.',
];

const DONT = [
  'Advertise products or services, or post spam.',
  "Ask for money outside the platform's published channels.",
  'Share hateful, harassing or misleading content.',
  "Post someone's phone number, address or ID without consent.",
  'Impersonate a person or organisation.',
];

const MODERATION = [
  { icon: Eye, title: 'Every post is reviewed', body: 'Posts are checked by moderators before they appear publicly. If one is declined, the author is told why.' },
  { icon: Flag, title: 'Report what feels wrong', body: 'Use the report option on any post or comment. Reports go straight to the moderation team.' },
  { icon: Sparkles, title: 'Second chances, firm limits', body: 'Most issues are solved with a note. Repeated or serious harm leads to removal from the platform.' },
];

const STAT_ITEMS = [
  { key: 'totalMembers', label: 'Members' },
  { key: 'totalActivities', label: 'Community activities' },
  { key: 'peopleConnected', label: 'Times people joined in' },
  { key: 'communitiesReached', label: 'Places reached' },
];

const Heading = ({ eyebrow, title, deva = true }) => (
  <View style={{ gap: 4 }}>
    <T variant={deva ? 'eyebrowDeva' : 'eyebrow'}>{eyebrow}</T>
    <T variant="h1">{title}</T>
  </View>
);

export default function About() {
  const { section } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const registrationsOn = settings?.allowRegistrations !== false;
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const guidelinesY = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get('/stats');
      if (res.data?.success) setStats(res.data.data);
    } catch { /* the stats block is simply hidden */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  // Deep link /about?section=guidelines (web: /about#guidelines).
  const onGuidelinesLayout = (e) => {
    guidelinesY.current = e.nativeEvent.layout.y;
    if (section === 'guidelines') {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, guidelinesY.current - 8), animated: true }));
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 72 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {/* Hero */}
        <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 20, gap: 14 }}>
          <T variant="eyebrow">Our mission</T>
          <View>
            <T style={{ fontFamily: fonts.displayBold, fontSize: 36, lineHeight: 44, color: colors.brand }}>हातेमालो</T>
            <T variant="display">means hand in hand.</T>
          </View>
          <T variant="body" style={{ color: colors.muted }}>
            It is the old way of getting things done in Nepal: neighbours joining hands to raise a roof, carry a load up the hill, or see a family through a hard season. Hateymalo brings that same habit online, so help can find the people who need it.
          </T>
          <T variant="h3" style={{ color: colors.pine }}>मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।</T>
          <View style={{ alignSelf: 'center', backgroundColor: colors.white, borderRadius: 28, padding: 24, marginTop: 4, ...shadow.lift }}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 160, height: 120 }}
              contentFit="contain"
              accessibilityLabel="Hateymalo (हातेमालो) logo"
            />
          </View>
        </View>

        {/* Story */}
        <View style={{ gap: 12 }}>
          <Heading eyebrow="हाम्रो कथा" title="Why we built it" />
          <T variant="body">
            Most people want to help. What usually stops them is not a lack of kindness but a lack of a clear, trustworthy place to start: who needs what, where, and whether it is genuine.
          </T>
          <T variant="body">
            Hateymalo is that place. Someone posts a need. It is reviewed so it stays genuine. People nearby can join in, offer a skill, or support a campaign whose every expense is published. Nobody pays to ask for help.
          </T>
        </View>

        {/* Real numbers */}
        {stats ? (
          <Card style={{ gap: 14 }} accessibilityLabel="Community so far">
            <T variant="small">The community so far, counted live from the platform:</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 }}>
              {STAT_ITEMS.map(({ key, label }) => (
                <View key={key} style={{ width: '50%', paddingRight: 8 }}>
                  <T style={{ fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, color: colors.ink }}>{formatNumber(stats[key] ?? 0)}</T>
                  <T variant="small">{label}</T>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

        {/* How it works */}
        <View style={{ gap: 12 }}>
          <Heading eyebrow="कसरी काम गर्छ" title="How it works" />
          {PILLARS.map(({ icon: Icon, ne, en, body, tone }) => (
            <View key={en} style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 18, gap: 10 }}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={tone.fg} />
              </View>
              <View>
                <T variant="h3">{ne}</T>
                <T variant="semibold" style={{ color: colors.muted, fontSize: 15 }}>{en}</T>
              </View>
              <T variant="body">{body}</T>
            </View>
          ))}
        </View>

        {/* Values */}
        <View style={{ gap: 12 }}>
          <Heading eyebrow="हाम्रा मूल्यहरू" title="What we hold on to" />
          {VALUES.map(({ icon: Icon, title, body }) => (
            <Card key={title} style={{ gap: 8 }}>
              <Icon size={26} color={colors.pine} />
              <T variant="h3">{title}</T>
              <T variant="small" style={{ color: colors.inkSoft }}>{body}</T>
            </Card>
          ))}
        </View>

        {/* Guidelines */}
        <View style={{ gap: 12 }} onLayout={onGuidelinesLayout}>
          <Heading eyebrow="सामुदायिक नियम" title="Community guidelines" />
          <T variant="body" style={{ color: colors.muted }}>
            A few simple agreements keep Hateymalo safe and genuine for everyone. By posting or joining, you agree to them.
          </T>
          <RuleList title="Please do" icon={CheckCircle2} color={colors.pine} items={DO} />
          <RuleList title="Please don't" icon={XCircle} color={colors.brand} items={DONT} />
          {MODERATION.map(({ icon: Icon, title, body }) => (
            <View key={title} style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 18, gap: 6 }}>
              <Icon size={22} color={colors.sky} />
              <T variant="semibold">{title}</T>
              <T variant="small" style={{ color: colors.inkSoft }}>{body}</T>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ backgroundColor: colors.night, borderRadius: radius.card, padding: 24, gap: 12, alignItems: 'center' }}>
          <T variant="eyebrowDeva" style={{ color: colors.marigold }}>हातेमालो</T>
          <T variant="h1" style={{ color: colors.white, textAlign: 'center' }}>Join hands with us</T>
          <T variant="body" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            Create an account to ask for help or offer it, or simply look around first.
          </T>
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 4 }}>
            {!isAuthenticated && registrationsOn ? (
              <Button title="Create an account" iconRight={ArrowRight} full onPress={() => router.push('/register')} />
            ) : null}
            <Button title="Explore help requests" variant="ghost" full onPress={() => router.push('/explore')} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const RuleList = ({ title, icon: Icon, color, items }) => (
  <Card style={{ gap: 12 }}>
    <Row gap={8}>
      <Icon size={20} color={color} />
      <T variant="h3" style={{ color }}>{title}</T>
    </Row>
    {items.map((t) => (
      <Row key={t} gap={10} style={{ alignItems: 'flex-start' }}>
        <Icon size={16} color={color} style={{ marginTop: 4 }} />
        <T variant="body" style={{ flex: 1 }}>{t}</T>
      </Row>
    ))}
  </Card>
);
