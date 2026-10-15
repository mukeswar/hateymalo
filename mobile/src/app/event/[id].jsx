import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  Ban,
  CalendarDays,
  CalendarX2,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Share2,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, fonts, radius, space } from '../../theme';
import { T, Avatar, Button, Card, Divider, ProgressBar, Row, Screen, Skeleton, EmptyState } from '../../components/ui';
import CommentSection from '../../components/CommentSection';
import AdSlot from '../../components/ads/AdSlot';
import { EventCover, EventStatusChip, OverlayChip } from '../../components/events/EventBits';
import { publicLink, shareLink } from '../../components/blogs/share';

// Port of frontend/src/pages/EventDetails.jsx

const MAX_FACES = 12;

const Fact = ({ icon: Icon, label, children, onPress }) => {
  const body = (
    <View style={styles.fact}>
      <View style={styles.factIcon}>
        <Icon size={20} color={colors.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T variant="caption" style={styles.factLabel}>{label}</T>
        {children}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
};

const sameId = (u, id) => (u && (u._id || u)) === id;

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await API.get(`/events/${id}`);
      if (res.data.success) setEvent(res.data.data);
    } catch {
      showToast('Failed to load event details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvent();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={240} radius={20} />
        <Skeleton height={36} width="80%" />
        <Skeleton height={220} radius={20} />
        <Skeleton height={180} radius={20} />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <EmptyState
          icon={CalendarX2}
          title="We couldn't find this event"
          message="It may have been removed, or the link may be incorrect."
          action="Back to events"
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/events'))}
        />
      </Screen>
    );
  }

  const {
    title,
    description,
    coverImage,
    category,
    location,
    date,
    startTime,
    endTime,
    maxParticipants,
    status,
    creator,
    isFeatured,
    joinedUsers = [],
    interestedUsers = [],
  } = event;

  const isJoined = !!user && joinedUsers.some((u) => sameId(u, user._id));
  const isInterested = !!user && interestedUsers.some((u) => sameId(u, user._id));
  const joinedCount = joinedUsers.length;
  // Same rule as the website and the API (joined >= maxParticipants blocks new joins).
  const isFull = joinedCount >= maxParticipants;
  const cancelled = status === 'CANCELLED';
  const max = Number(maxParticipants) || 0;
  const pct = max > 0 ? Math.min(100, Math.round((joinedCount / max) * 100)) : 0;
  const seatsLeft = Math.max(0, max - joinedCount);

  const dateObj = new Date(date);
  const validDate = !!date && !Number.isNaN(dateObj.getTime());
  const dateLabel = validDate
    ? dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';
  let dateNepali = null;
  if (validDate) {
    try {
      const ne = dateObj.toLocaleDateString('ne-NP', { month: 'long', day: 'numeric', year: 'numeric' });
      const en = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      // Some JS engines lack the Nepali locale and fall back to English — don't repeat the date then.
      if (ne && ne !== en) dateNepali = ne;
    } catch {
      dateNepali = null;
    }
  }

  const requireLogin = (message) => {
    showToast(message, 'info');
    router.push('/login');
  };

  const handleJoinToggle = async () => {
    if (!user) return requireLogin('Please log in to join official events');
    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/join`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Join failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInterestToggle = async () => {
    if (!user) return requireLogin('Please log in to mark interest');
    setActionLoading(true);
    try {
      const res = await API.post(`/events/${id}/interest`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchEvent();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Action failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareLink({ title, url: publicLink(`/events/${id}`, `/event/${id}`) });
      if (result === 'copied') showToast('Event link copied to clipboard!', 'success');
    } catch {
      showToast('Could not share this event', 'error');
    }
  };

  const openMap = () => {
    if (!location) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`).catch(() =>
      showToast('Could not open maps', 'error'),
    );
  };

  const faces = joinedUsers.slice(0, MAX_FACES);
  const extraFaces = joinedUsers.length - faces.length;

  const joinTitle = cancelled
    ? 'Event cancelled'
    : isJoined
      ? "You're going · Cancel registration"
      : isFull
        ? 'Event fully booked'
        : 'Register & join';
  const joinIcon = cancelled ? Ban : isJoined ? UserCheck : isFull ? undefined : UserPlus;
  const joinVariant = isJoined ? 'ghost' : cancelled || isFull ? 'soft' : 'primary';

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Event' }} />

      {cancelled ? (
        <View style={styles.cancelBanner} accessibilityRole="alert">
          <View style={styles.cancelIcon}>
            <Ban size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="h3" style={{ color: colors.brandDark }}>This event has been cancelled</T>
            <T variant="small" style={{ color: colors.inkSoft }}>
              Registration is closed. Please don't travel to the venue for this event. We'll share any new dates on the events page.
            </T>
          </View>
        </View>
      ) : null}

      <EventCover uri={coverImage} cancelled={cancelled} height={240} gradient={0.55} style={{ borderRadius: radius.card }}>
        <Row gap={6} wrap style={styles.overlayTop}>
          {category ? <OverlayChip label={category} /> : null}
          <EventStatusChip status={status} />
          {isFeatured ? <OverlayChip label="Featured" icon={Sparkles} bg={colors.marigoldTint} fg={colors.marigoldText} /> : null}
        </Row>
      </EventCover>

      <T
        variant="display"
        style={cancelled && { textDecorationLine: 'line-through', textDecorationColor: colors.brand }}
      >
        {title}
      </T>

      {/* RSVP panel */}
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: 2 }}>
          <T variant="eyebrowDeva">सहभागी हुनुहोस्</T>
          <T variant="h1">Save your seat</T>
          <T variant="small">Free to join. Let the organisers know you're coming.</T>
        </View>

        {max > 0 ? (
          <View style={{ gap: 8 }}>
            <View style={styles.seatRow}>
              <T style={styles.seatCount}>
                {joinedCount}
                <T style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.muted }}> / {max}</T>
              </T>
              <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: isFull ? colors.brand : colors.pine }}>
                {isFull ? 'Fully booked' : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`}
              </T>
            </View>
            <ProgressBar value={pct} />
            <T variant="caption">{joinedCount} registered · capacity {max}</T>
          </View>
        ) : null}

        <Button
          title={joinTitle}
          icon={joinIcon}
          variant={joinVariant}
          size="lg"
          full
          loading={actionLoading}
          disabled={cancelled || (isFull && !isJoined)}
          onPress={handleJoinToggle}
        />

        <Button
          title={`${isInterested ? 'Interested' : "I'm interested"} · ${interestedUsers.length}`}
          icon={Heart}
          variant={isInterested ? 'danger' : 'ghost'}
          full
          disabled={actionLoading}
          onPress={handleInterestToggle}
          accessibilityLabel={isInterested ? 'Interested, tap to remove' : "I'm interested"}
        />

        <Button title="Share event" icon={Share2} variant="text" full onPress={handleShare} />

        {creator ? (
          <>
            <Divider />
            <View style={{ gap: 10 }}>
              <T variant="caption" style={styles.factLabel}>Organised by</T>
              <Pressable
                onPress={() => creator._id && router.push(`/profile/${creator._id}`)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.organiser, pressed && { opacity: 0.7 }]}
              >
                <Avatar name={creator.name} src={creator.profilePicture} size="md" />
                <View style={{ flex: 1 }}>
                  <T variant="semibold" numberOfLines={1}>{creator.name}</T>
                  <Row gap={4}>
                    <ShieldCheck size={14} color={colors.pine} />
                    <T variant="caption" style={{ color: colors.pine }}>HATEYMALO team</T>
                  </Row>
                </View>
              </Pressable>
            </View>
          </>
        ) : null}
      </Card>

      {/* Facts */}
      <Card style={{ gap: space.lg }}>
        <Fact icon={CalendarDays} label="Date">
          <T variant="medium">{dateLabel}</T>
          {dateNepali ? <T variant="small">{dateNepali}</T> : null}
        </Fact>
        <Fact icon={Clock} label="Time">
          <T variant="medium">{startTime || endTime ? `${startTime || ''} – ${endTime || ''}` : 'To be announced'}</T>
        </Fact>
        <Fact icon={MapPin} label="Location" onPress={location ? openMap : undefined}>
          <T variant="medium">{location || 'To be announced'}</T>
          {location ? (
            <Row gap={4} style={{ marginTop: 2 }}>
              <ExternalLink size={13} color={colors.brand} />
              <T variant="caption" style={{ color: colors.brand }}>Open in maps</T>
            </Row>
          ) : null}
        </Fact>
        {max > 0 ? (
          <Fact icon={Users} label="Capacity">
            <T variant="medium">{max} participants</T>
          </Fact>
        ) : null}
      </Card>

      {/* About */}
      <View style={{ gap: 8 }}>
        <T variant="h1">About this event</T>
        <T variant="body" style={{ fontSize: 17, lineHeight: 27 }}>{description}</T>
      </View>

      {/* Attendees */}
      <Card style={{ gap: space.md }}>
        <View style={styles.seatRow}>
          <Row gap={8}>
            <Users size={20} color={colors.pine} />
            <T variant="h2">Who's going</T>
          </Row>
          <View style={styles.countChip}>
            <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.pine }}>
              {joinedCount}
              {max > 0 ? ` / ${max}` : ''}
            </T>
          </View>
        </View>
        {joinedUsers.length > 0 ? (
          <>
            <View style={styles.faces}>
              {faces.map((u) => (
                <View key={u._id || u} style={styles.face}>
                  <Avatar name={u.name || 'Participant'} src={u.profilePicture} size="sm" />
                  <T variant="medium" style={{ fontSize: 14, color: colors.inkSoft, maxWidth: 140 }} numberOfLines={1}>
                    {u.name || 'Participant'}
                  </T>
                </View>
              ))}
            </View>
            {extraFaces > 0 ? <T variant="small">and {extraFaces} more</T> : null}
          </>
        ) : (
          <T variant="small">
            {cancelled ? 'No one is registered for this event.' : 'No one has registered yet — be the first to join.'}
          </T>
        )}
      </Card>

      {/* Sponsored (content.footer) — renders nothing when there is no ad */}
      <AdSlot placement="content.footer" category={category || ''} />

      {/* Discussion */}
      <CommentSection postId={id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancelBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(181,35,44,0.3)',
    backgroundColor: colors.brandTint,
  },
  cancelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: { position: 'absolute', top: 14, left: 14, right: 14 },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  factIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factLabel: { textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.semibold, marginBottom: 2 },
  seatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  seatCount: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 36, color: colors.ink },
  organiser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countChip: { backgroundColor: colors.pineTint, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  faces: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 12 },
  face: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
