import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowRight,
  BellRing,
  Check,
  Copy,
  Eye,
  EyeOff,
  FileCheck2,
  HandHeart,
  Megaphone,
  PauseCircle,
  QrCode,
  ReceiptText,
  Server,
  ShieldCheck,
  Sprout,
  Users,
  Wallet,
} from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { colors, fonts, radius, shadow, space } from '../theme';
import { Avatar, Button, Card, Chip, ProgressBar, Row, Screen, Skeleton, T } from '../components/ui';
import DonationModal from '../components/DonationModal';
import FinancialTransparencySection from '../components/FinancialTransparencySection';

// Port of frontend/src/pages/Donate.jsx.
const npr = (n) => `रु ${Number(n || 0).toLocaleString('en-IN')}`;

const ALLOCATIONS = [
  { icon: Server, title: 'Keeping the platform free', body: 'Hosting, database and uptime, so anyone can post a help request without paying anything.' },
  { icon: BellRing, title: 'Reaching nearby helpers', body: 'Notifications that let verified volunteers close by know when someone needs a hand.' },
  { icon: Sprout, title: 'Supplies for volunteer drives', body: 'Gloves, waste bags, saplings and stationery for community campaigns, logged with receipts.' },
];

const STEPS = [
  { icon: Wallet, title: 'Pay directly', body: 'Scan the official QR or send to the listed wallet from eSewa, Khalti, Fonepay or your bank.' },
  { icon: FileCheck2, title: 'Log your contribution', body: 'Record the amount and method here so it is added to the public totals with a transaction ID.' },
  { icon: ReceiptText, title: 'Follow every rupee', body: 'Campaign organisers publish each expense with receipts. Open any campaign ledger to see them.' },
];

const Heading = ({ eyebrow, title, text }) => (
  <View style={{ gap: 6 }}>
    <T variant="eyebrowDeva">{eyebrow}</T>
    <T variant="h1">{title}</T>
    {text ? <T variant="body" style={{ color: colors.muted }}>{text}</T> : null}
  </View>
);

export default function Donate() {
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [openLedger, setOpenLedger] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const campaignsY = useRef(0);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await API.get('/donations/campaigns');
      if (res.data?.success) setCampaigns(res.data.data || []);
      setCampaignsError('');
    } catch (err) {
      setCampaignsError(errorMessage(err, 'Could not load campaigns.'));
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCampaigns(), refreshSettings()]);
    setRefreshing(false);
  };

  // Only show payment details an administrator actually published.
  const qrImageUrl = settings?.paymentQrCode || '';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '';

  const copyPhone = async () => {
    try {
      await Clipboard.setStringAsync(qrPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch { /* number stays visible for manual copy */ }
  };

  const openDonation = (campaign = null) => {
    setSelectedCampaign(campaign);
    setShowModal(true);
  };

  const donationsDisabled = !!settings && settings.allowPublicDonations === false;

  if (donationsDisabled) {
    return (
      <Screen contentStyle={{ paddingTop: 40 }}>
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.marigoldTint, alignItems: 'center', justifyContent: 'center' }}>
            <PauseCircle size={32} color={colors.marigoldText} />
          </View>
          <T variant="eyebrowDeva" style={{ textAlign: 'center' }}>सहयोग अस्थायी रूपमा रोकिएको छ</T>
          <T variant="h1" style={{ textAlign: 'center' }}>Donations are paused for now</T>
          <T variant="body" style={{ textAlign: 'center', color: colors.muted }}>
            Voluntary contributions are currently turned off by the platform administrators. Please check back soon. You can still help by joining a request or volunteering your time.
          </T>
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 6 }}>
            <Button title="See help requests" iconRight={ArrowRight} full onPress={() => router.push('/explore')} />
            <Button title="Back home" variant="ghost" full onPress={() => router.replace('/')} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 72 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        {/* Header */}
        <View style={{ gap: 12 }}>
          <T variant="eyebrowDeva">हातेमालो सहयोग</T>
          <T variant="display">Give if you can, and see exactly where it goes.</T>
          <T variant="body" style={{ color: colors.muted }}>
            Every contribution is voluntary. Hateymalo charges no fees to people asking for help, and every campaign publishes its expenses with receipts, so you never have to take anyone's word for it.
          </T>
          <View style={{ gap: 10 }}>
            <Button title="Support the platform" icon={HandHeart} size="lg" full onPress={() => openDonation(null)} />
            <Button
              title="Browse campaigns"
              variant="ghost"
              size="lg"
              full
              onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, campaignsY.current - 8), animated: true })}
            />
          </View>
          <View style={{ gap: 6, marginTop: 4 }}>
            {[
              [ShieldCheck, 'Voluntary, no pressure'],
              [ReceiptText, 'Public expense ledgers'],
              [FileCheck2, 'Transaction ID for every gift'],
            ].map(([Icon, label]) => (
              <Row key={label} gap={8}>
                <Icon size={16} color={colors.pine} />
                <T variant="small" style={{ color: colors.inkSoft }}>{label}</T>
              </Row>
            ))}
          </View>
        </View>

        {/* Payment card */}
        <Card style={{ gap: 14 }}>
          <Chip label="Official payment details" icon={QrCode} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 4 }} />
          <T variant="h2">Scan & pay directly</T>
          <T variant="small" style={{ color: colors.inkSoft }}>{qrInstructions}</T>

          {qrImageUrl ? (
            <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 16, alignItems: 'center', gap: 8 }}>
              <Image
                source={{ uri: qrImageUrl }}
                style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.sand }}
                contentFit="contain"
                accessibilityLabel="Hateymalo official donation QR code"
              />
              <T variant="caption">eSewa · Khalti · Fonepay</T>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 18 }}>
              <T variant="small" style={{ textAlign: 'center' }}>
                {settings ? 'The official QR code has not been published yet.' : 'Loading payment details…'}
              </T>
            </View>
          )}

          {qrPhone ? (
            <Row gap={12} style={{ borderWidth: 1, borderColor: colors.sand, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10 }}>
              <View style={{ flex: 1 }}>
                <T variant="caption">Official wallet ID / mobile</T>
                <T variant="semibold" selectable>{qrPhone}</T>
              </View>
              <Pressable
                onPress={copyPhone}
                accessibilityRole="button"
                accessibilityLabel={copiedPhone ? 'Copied' : 'Copy wallet number'}
                style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}
              >
                {copiedPhone ? <Check size={16} color={colors.pine} /> : <Copy size={16} color={colors.inkSoft} />}
              </Pressable>
            </Row>
          ) : null}

          <Button title="Already paid? Log your contribution" iconRight={ArrowRight} variant="pine" full onPress={() => openDonation(null)} />
        </Card>

        {/* Campaigns */}
        <View style={{ gap: 14 }} onLayout={(e) => { campaignsY.current = e.nativeEvent.layout.y; }}>
          <Heading
            eyebrow="अभियानहरू"
            title="Campaigns you can follow all the way through"
            text="Each campaign shows what has been raised, who is organising it, and an open ledger of what has been spent."
          />

          {campaignsLoading ? (
            [1, 2].map((n) => <Skeleton key={n} height={240} radius={radius.card} />)
          ) : campaignsError && campaigns.length === 0 ? (
            <Card style={{ gap: 10, alignItems: 'center' }}>
              <T variant="small" style={{ textAlign: 'center' }}>{campaignsError}</T>
              <Button title="Try again" variant="ghost" size="sm" onPress={() => { setCampaignsLoading(true); fetchCampaigns(); }} />
            </Card>
          ) : campaigns.length === 0 ? (
            <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.skyTint, alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={26} color={colors.sky} />
              </View>
              <T variant="h3" style={{ textAlign: 'center' }}>No campaigns are running right now</T>
              <T variant="small" style={{ textAlign: 'center' }}>You can still support the platform itself, which keeps help requests free for everyone.</T>
              <Button title="Support the platform" onPress={() => openDonation(null)} />
            </Card>
          ) : (
            campaigns.map((c) => {
              const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
              const completed = c.status === 'COMPLETED';
              const ledgerOpen = openLedger === c._id;
              return (
                <View key={c._id} style={{ gap: 12 }}>
                  <Card style={{ gap: 12 }}>
                    <Row gap={10} style={{ justifyContent: 'space-between' }}>
                      <Row gap={8} style={{ flex: 1 }}>
                        <Avatar name={c.creator?.name || 'Hateymalo'} src={c.creator?.profilePicture} size="sm" />
                        <View style={{ flex: 1 }}>
                          <T variant="caption">Organised by</T>
                          <T variant="semibold" numberOfLines={1} style={{ fontSize: 14 }}>{c.creator?.name || 'Hateymalo'}</T>
                        </View>
                      </Row>
                      {completed ? (
                        <Chip label="Goal reached" tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                      ) : (
                        <Chip label="Active" tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                      )}
                    </Row>

                    <T variant="h3">{c.title}</T>
                    {c.description ? <T variant="small" numberOfLines={3}>{c.description}</T> : null}

                    <View style={{ gap: 6 }} accessibilityLabel={`${c.title}: ${pct}% of goal raised`}>
                      <ProgressBar value={pct} />
                      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <T variant="small">
                          <T style={{ fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink }}>{npr(c.raisedAmount)}</T>
                          {' '}of {npr(c.goalAmount)}
                        </T>
                        <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.marigoldText }}>{pct}%</T>
                      </Row>
                      <Row gap={5}>
                        <Users size={13} color={colors.muted} />
                        <T variant="caption">{c.donorsCount || 0} {c.donorsCount === 1 ? 'supporter' : 'supporters'}</T>
                      </Row>
                    </View>

                    <Row gap={8}>
                      {!completed ? (
                        <Button title="Contribute" icon={HandHeart} size="sm" onPress={() => openDonation(c)} style={{ flex: 1 }} />
                      ) : null}
                      <Button
                        title={ledgerOpen ? 'Hide ledger' : 'Where the money goes'}
                        icon={ledgerOpen ? EyeOff : Eye}
                        size="sm"
                        variant="ghost"
                        onPress={() => setOpenLedger(ledgerOpen ? null : c._id)}
                        style={{ flex: 1 }}
                      />
                    </Row>
                  </Card>

                  {ledgerOpen ? (
                    <View style={{ gap: 8 }}>
                      <T variant="semibold">
                        Ledger · <T style={{ fontFamily: fonts.medium, color: colors.inkSoft }}>{c.title}</T>
                      </T>
                      <FinancialTransparencySection
                        key={c._id}
                        campaignId={c._id}
                        isOrganizer={!!user && c.creator?._id === user._id}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>

        {/* Where platform support goes */}
        <View style={{ gap: 12 }}>
          <Heading
            eyebrow="पैसा कहाँ जान्छ"
            title="Where platform support goes"
            text="Hateymalo has no subscription fees. Voluntary platform support is used for running costs and volunteer logistics, nothing more."
          />
          {ALLOCATIONS.map(({ icon: Icon, title, body }) => (
            <View key={title} style={{ backgroundColor: colors.paperDeep, borderRadius: radius.card, padding: 18, gap: 8 }}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', ...shadow.soft }}>
                <Icon size={22} color={colors.pine} />
              </View>
              <T variant="h3">{title}</T>
              <T variant="small" style={{ color: colors.inkSoft }}>{body}</T>
            </View>
          ))}
        </View>

        {/* How giving works */}
        <View style={{ gap: 12 }}>
          <Heading eyebrow="कसरी काम गर्छ" title="How giving works" />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Card key={title} style={{ gap: 8 }}>
              <Row gap={10}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
                  <T style={{ fontFamily: fonts.displayBold, fontSize: 16, color: colors.brand }}>{i + 1}</T>
                </View>
                <Icon size={20} color={colors.inkSoft} />
              </Row>
              <T variant="h3">{title}</T>
              <T variant="small">{body}</T>
            </Card>
          ))}
        </View>

        {/* Closing */}
        <View style={{ backgroundColor: colors.pine, borderRadius: radius.card, padding: 24, gap: 12, alignItems: 'center' }}>
          <T variant="eyebrowDeva" style={{ color: colors.marigold }}>हातेमालो</T>
          <T variant="h1" style={{ color: colors.white, textAlign: 'center' }}>Money is one way to help. Time is another.</T>
          <T variant="body" style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            If giving isn't right for you today, that's completely fine. Joining a request or an event matters just as much.
          </T>
          <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 4 }}>
            <Button title="Make a contribution" variant="ghost" full onPress={() => openDonation(null)} />
            <Button title="See help requests" variant="pine" full onPress={() => router.push('/explore')} style={{ borderColor: 'rgba(255,255,255,0.4)' }} />
          </View>
        </View>
      </ScrollView>

      <DonationModal
        isOpen={showModal}
        campaign={selectedCampaign}
        onClose={() => setShowModal(false)}
        onSuccess={fetchCampaigns}
      />
    </Screen>
  );
}
