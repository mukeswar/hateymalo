import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, CheckCircle2, Heart, MapPin } from 'lucide-react-native';
import { Avatar, Card, ProgressBar, T, VerificationBadge } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Port of frontend/src/components/PostCard.jsx (same `{ post }` prop).
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=800&q=70';

const shortDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const PostCard = ({ post, style }) => {
  if (!post) return null;

  const {
    _id,
    title,
    description,
    category,
    location,
    images = [],
    creator,
    joinedUsers = [],
    interestedUsers = [],
    requiredMembers,
    dateTime,
    status,
  } = post;

  const coverImage = images.length > 0 ? images[0] : FALLBACK_IMAGE;
  const joined = joinedUsers.length;
  const needed = Number(requiredMembers) || 0;
  const pct = needed > 0 ? Math.min(100, Math.round((joined / needed) * 100)) : null;
  const when = shortDate(dateTime);
  const completed = status === 'COMPLETED';

  return (
    <Card padded={false} onPress={() => router.push(`/post/${_id}`)} accessibilityLabel={title} style={[styles.card, style]}>
      <View style={styles.cover}>
        <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFill} />
        <View style={styles.badges}>
          {category ? (
            <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.95)' }]}>
              <T style={styles.pillText} numberOfLines={1}>{category}</T>
            </View>
          ) : null}
          {completed ? (
            <View style={[styles.pill, { backgroundColor: colors.pine }]}>
              <CheckCircle2 size={13} color={colors.white} />
              <T style={[styles.pillText, { color: colors.white }]}>Completed</T>
            </View>
          ) : null}
        </View>
        {location ? (
          <View style={styles.location}>
            <MapPin size={15} color={colors.white} />
            <T style={styles.locationText} numberOfLines={1}>{location}</T>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <T variant="h3" numberOfLines={2}>{title}</T>
        {description ? <T variant="small" numberOfLines={2}>{description}</T> : null}

        {pct !== null ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            <View style={styles.between}>
              <T style={styles.meta}>{joined} of {needed} helpers joined</T>
              <T variant="caption">{pct}%</T>
            </View>
            <ProgressBar value={pct} />
          </View>
        ) : null}

        <View style={[styles.between, styles.footer]}>
          {creator ? (
            <View style={styles.creator}>
              <Avatar name={creator.name} src={creator.profilePicture} size="xs" />
              <T style={styles.meta} numberOfLines={1}>{creator.name}</T>
              <VerificationBadge level={creator.memberLevel} isVerified={creator.isVerified} showLabel={false} />
            </View>
          ) : <View />}
          <View style={styles.stats}>
            {when ? (
              <View style={styles.stat}>
                <CalendarDays size={14} color={colors.muted} />
                <T variant="caption">{when}</T>
              </View>
            ) : null}
            <View style={styles.stat} accessibilityLabel={`${interestedUsers.length} interested`}>
              <Heart size={14} color={colors.muted} />
              <T variant="caption">{interestedUsers.length}</T>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  cover: { aspectRatio: 16 / 10, backgroundColor: colors.paperDeep, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, overflow: 'hidden' },
  badges: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  location: { position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.white },
  body: { padding: space.lg, gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meta: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft, flexShrink: 1 },
  footer: { borderTopWidth: 1, borderTopColor: colors.sand, paddingTop: 10, marginTop: 4 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});

export default PostCard;
