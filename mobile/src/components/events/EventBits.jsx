import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ban, CalendarDays, Users } from 'lucide-react-native';
import { colors, fonts, radius, shadow } from '../../theme';
import { T, ProgressBar } from '../ui';

// Shared pieces of the Events list and Event details screens (port of the
// helpers at the top of frontend/src/pages/Events.jsx and EventDetails.jsx).

export const STATUS_FILTERS = [
  { value: 'ALL', label: 'All events' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Happening now' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const STATUS_STYLE = {
  UPCOMING: { label: 'Upcoming', bg: colors.skyTint, fg: colors.sky },
  ONGOING: { label: 'Happening now', bg: colors.marigoldTint, fg: colors.marigoldText },
  COMPLETED: { label: 'Completed', bg: colors.pineTint, fg: colors.pine },
  CANCELLED: { label: 'Cancelled', bg: colors.brand, fg: colors.white },
};

export const dateParts = (d) => {
  const date = new Date(d);
  if (!d || Number.isNaN(date.getTime())) return null;
  return {
    month: date.toLocaleDateString('en-GB', { month: 'short' }),
    day: date.getDate(),
    full: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
};

export const capacity = (event) => {
  const joined = event.joinedUsers ? event.joinedUsers.length : 0;
  const max = Number(event.maxParticipants) || 0;
  const pct = max > 0 ? Math.min(100, Math.round((joined / max) * 100)) : 0;
  return { joined, max, pct, isFull: max > 0 && joined >= max };
};

export const EventStatusChip = ({ status, style }) => {
  const s = STATUS_STYLE[status];
  if (!s) return null;
  return (
    <View style={[styles.chip, { backgroundColor: s.bg }, style]}>
      {status === 'CANCELLED' ? <Ban size={13} color={s.fg} /> : null}
      <T style={[styles.chipText, { color: s.fg }]}>{s.label}</T>
    </View>
  );
};

// Small pill used on top of cover images (category, featured).
export const OverlayChip = ({ label, icon: Icon, bg = 'rgba(255,255,255,0.95)', fg = colors.ink }) => (
  <View style={[styles.chip, { backgroundColor: bg }, shadow.soft]}>
    {Icon ? <Icon size={13} color={fg} /> : null}
    <T style={[styles.chipText, { color: fg }]} numberOfLines={1}>{label}</T>
  </View>
);

export const DateBlock = ({ date, cancelled, large = false }) => {
  const p = dateParts(date);
  if (!p) return null;
  const size = large ? 76 : 62;
  return (
    <View style={[styles.dateBlock, { width: size, height: size }, cancelled && { opacity: 0.85 }]} accessibilityLabel={p.full}>
      <T style={[styles.dateMonth, { color: cancelled ? colors.muted : colors.brand }]}>{p.month}</T>
      <T
        style={[
          styles.dateDay,
          { fontSize: large ? 30 : 24, lineHeight: large ? 34 : 28 },
          cancelled && { textDecorationLine: 'line-through', textDecorationColor: colors.brand },
        ]}
      >
        {p.day}
      </T>
    </View>
  );
};

export const CapacityMeter = ({ event }) => {
  const { joined, max, pct, isFull } = capacity(event);
  if (!max) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.meterRow}>
        <View style={styles.meterLeft}>
          <Users size={14} color={colors.inkSoft} />
          <T style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft }}>
            {joined} of {max} joined
          </T>
        </View>
        <T style={{ fontSize: 13, fontFamily: isFull ? fonts.semibold : fonts.body, color: isFull ? colors.brand : colors.muted }}>
          {isFull ? 'Fully booked' : `${Math.max(0, max - joined)} seats left`}
        </T>
      </View>
      <ProgressBar value={pct} />
    </View>
  );
};

// Cover image with a bottom gradient. Cancelled events are washed out (the web
// uses a grayscale filter, which React Native does not support everywhere).
// No stock fallback photo: a plain tile is shown when there is no cover.
export const EventCover = ({ uri, cancelled, height, style, children, gradient = 0.35 }) => (
  <View style={[{ height, backgroundColor: colors.paperDeep, overflow: 'hidden' }, style]}>
    {uri ? (
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    ) : (
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <CalendarDays size={36} color={colors.muted} />
      </View>
    )}
    {cancelled ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(244,236,223,0.45)' }]} /> : null}
    {uri ? (
      <LinearGradient
        colors={['transparent', `rgba(0,0,0,${gradient})`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        pointerEvents="none"
      />
    ) : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 },
  dateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sand,
    ...shadow.soft,
  },
  dateMonth: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 15 },
  dateDay: { fontFamily: fonts.displayBold, color: colors.ink },
  meterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meterLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
