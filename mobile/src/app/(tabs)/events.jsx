import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowRight, CalendarDays, CalendarX2, Clock, MapPin, Sparkles } from 'lucide-react-native';
import API from '../../lib/api';
import AdSlot from '../../components/ads/AdSlot';
import { colors, fonts, space } from '../../theme';
import { T, Card, ChipBar, Screen, Skeleton, Button, Divider, Row } from '../../components/ui';
import {
  STATUS_FILTERS,
  CapacityMeter,
  DateBlock,
  EventCover,
  EventStatusChip,
  OverlayChip,
} from '../../components/events/EventBits';

// Port of frontend/src/pages/Events.jsx

const Meta = ({ event }) => (
  <View style={{ gap: 6 }}>
    {event.location ? (
      <Row gap={8}>
        <MapPin size={16} color={colors.brand} />
        <T variant="small" style={{ color: colors.inkSoft, flex: 1 }} numberOfLines={1}>{event.location}</T>
      </Row>
    ) : null}
    {event.startTime || event.endTime ? (
      <Row gap={8}>
        <Clock size={16} color={colors.brand} />
        <T variant="small" style={{ color: colors.inkSoft }}>{event.startTime} – {event.endTime}</T>
      </Row>
    ) : null}
  </View>
);

const strike = { textDecorationLine: 'line-through', textDecorationColor: colors.brand };

const FeaturedEvent = ({ event }) => {
  const cancelled = event.status === 'CANCELLED';
  return (
    <Card padded={false} style={{ overflow: 'hidden' }} onPress={() => router.push(`/event/${event._id}`)} accessibilityLabel={event.title}>
      <EventCover uri={event.coverImage} cancelled={cancelled} height={210} gradient={0.4}>
        <Row gap={6} wrap style={styles.overlayTop}>
          <OverlayChip label="Featured" icon={Sparkles} bg={colors.marigoldTint} fg={colors.marigoldText} />
          {event.category ? <OverlayChip label={event.category} /> : null}
        </Row>
      </EventCover>
      <View style={{ padding: space.lg, gap: space.lg }}>
        <Row gap={14} style={{ alignItems: 'flex-start' }}>
          <DateBlock date={event.date} cancelled={cancelled} large />
          <View style={{ flex: 1, gap: 6 }}>
            <EventStatusChip status={event.status} />
            <T variant="h1" style={cancelled && strike}>{event.title}</T>
          </View>
        </Row>
        {event.description ? <T variant="body" style={{ color: colors.muted }} numberOfLines={3}>{event.description}</T> : null}
        <Meta event={event} />
        {!cancelled ? <CapacityMeter event={event} /> : null}
        <Row gap={6}>
          <T variant="semibold">View event</T>
          <ArrowRight size={16} color={colors.ink} />
        </Row>
      </View>
    </Card>
  );
};

const EventCard = ({ event }) => {
  const cancelled = event.status === 'CANCELLED';
  return (
    <Card
      padded={false}
      style={[{ overflow: 'hidden' }, event.isFeatured && { borderColor: colors.marigold, borderWidth: 2 }]}
      onPress={() => router.push(`/event/${event._id}`)}
      accessibilityLabel={event.title}
    >
      <EventCover uri={event.coverImage} cancelled={cancelled} height={180}>
        <View style={[styles.overlayTop, styles.overlaySplit]}>
          <Row gap={6} wrap style={{ flex: 1 }}>
            {event.isFeatured ? <OverlayChip label="Featured" icon={Sparkles} bg={colors.marigoldTint} fg={colors.marigoldText} /> : null}
            {event.category ? <OverlayChip label={event.category} /> : null}
          </Row>
          <EventStatusChip status={event.status} />
        </View>
      </EventCover>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 10 }}>
        <View style={{ marginTop: -30 }}>
          <DateBlock date={event.date} cancelled={cancelled} />
        </View>
        <T variant="h3" numberOfLines={2} style={cancelled && strike}>{event.title}</T>
        {event.description ? <T variant="small" numberOfLines={2}>{event.description}</T> : null}
        <Meta event={event} />
        <Divider style={{ marginTop: 4 }} />
        {cancelled ? (
          <Row gap={8}>
            <CalendarX2 size={16} color={colors.brand} />
            <T variant="small" style={{ color: colors.brand, fontFamily: fonts.semibold }}>This event has been cancelled</T>
          </Row>
        ) : (
          <CapacityMeter event={event} />
        )}
      </View>
    </Card>
  );
};

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const firstFocus = useRef(true);

  const fetchEvents = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get('/events');
      if (res.data.success) setEvents(res.data.data);
    } catch (error) {
      console.error('Failed to fetch events:', error?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Refresh quietly when coming back to the tab (e.g. after joining an event).
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      fetchEvents({ silent: true });
    }, [fetchEvents]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents({ silent: true });
    setRefreshing(false);
  };

  const filteredEvents = events.filter((e) => (statusFilter === 'ALL' ? true : e.status === statusFilter));
  // Spotlight the first featured, non-cancelled event (the API already sorts featured first).
  const spotlight = filteredEvents.find((e) => e.isFeatured && e.status !== 'CANCELLED');
  const gridEvents = spotlight ? filteredEvents.filter((e) => e._id !== spotlight._id) : filteredEvents;

  const header = (
    <View style={{ gap: space.lg }}>
      <View style={styles.masthead}>
        <Row gap={6}>
          <CalendarDays size={15} color={colors.brand} />
          <T variant="eyebrow">Events ·</T>
          <T variant="eyebrowDeva">कार्यक्रम</T>
        </Row>
        <T variant="display">Show up, together</T>
        <T variant="body" style={{ color: colors.muted }}>
          Community gatherings, clean-ups and volunteer drives organised by the HATEYMALO team. Pick one, save a seat, and come lend a hand.
        </T>
      </View>
      <ChipBar options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} style={{ paddingHorizontal: 0 }} />
      {/* Sponsored card at the top of the list (events.list); nothing when there is no ad */}
      <AdSlot placement="events.list" />
      {!loading && spotlight ? <FeaturedEvent event={spotlight} /> : null}
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: space.lg }} accessibilityLabel="Loading events">
      {[1, 2, 3].map((n) => <Skeleton key={n} height={300} radius={20} />)}
    </View>
  ) : filteredEvents.length === 0 ? (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: space.xxl }}>
      <View style={styles.emptyIcon}>
        <CalendarX2 size={26} color={colors.muted} />
      </View>
      <T variant="h2" style={{ textAlign: 'center' }}>No events here yet</T>
      <T variant="small" style={{ textAlign: 'center' }}>
        {statusFilter === 'ALL'
          ? 'There are no events scheduled right now. New gatherings will appear here as soon as they are announced.'
          : 'Nothing matches this filter. Try looking at all events instead.'}
      </T>
      {statusFilter !== 'ALL' ? (
        <Button title="Show all events" variant="ghost" onPress={() => setStatusFilter('ALL')} style={{ marginTop: 6 }} />
      ) : null}
    </Card>
  ) : null;

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : gridEvents}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <EventCard event={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
        ListHeaderComponentStyle={{ marginBottom: space.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: space.xxl * 2 },
  masthead: { gap: 8, paddingTop: space.sm },
  overlayTop: { position: 'absolute', top: 12, left: 12, right: 12 },
  overlaySplit: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
