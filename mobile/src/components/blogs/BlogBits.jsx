import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BookOpen, Eye, Heart } from 'lucide-react-native';
import { colors, fonts, radius, shadow } from '../../theme';
import { T, Avatar } from '../ui';

// Shared pieces of the Stories list / details screens (port of helpers in
// frontend/src/pages/Blogs.jsx and BlogDetails.jsx).

export const BLOG_FILTERS = ['All', 'Community Story', 'Volunteer Experience', 'Environment', 'Education', 'Social Impact'];

export const BLOG_CATEGORIES = [
  'Community Story',
  'Volunteer Experience',
  'Environment',
  'Education',
  'Social Impact',
  'Personal Reflection',
];

export const plain = (s = '') => String(s).replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
export const readMinutes = (s = '') => Math.max(1, Math.round(plain(s).split(' ').filter(Boolean).length / 200));
export const shortDate = (d) => {
  const date = new Date(d);
  return !d || Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const BlogCover = ({ uri, height, style }) => (
  <View style={[{ height, backgroundColor: colors.paperDeep, overflow: 'hidden' }, style]}>
    {uri ? (
      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
    ) : (
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <BookOpen size={34} color={colors.muted} />
      </View>
    )}
  </View>
);

export const Pill = ({ label, icon: Icon, bg, fg, elevated }) => (
  <View style={[styles.pill, { backgroundColor: bg }, elevated && shadow.soft]}>
    {Icon ? <Icon size={13} color={fg} /> : null}
    <T style={{ fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: fg }} numberOfLines={1}>{label}</T>
  </View>
);

export const Byline = ({ blog }) => (
  <View style={styles.byline}>
    {blog.author ? <Avatar name={blog.author.name} src={blog.author.profilePicture} size="sm" /> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft }} numberOfLines={1}>
        {blog.author?.name || 'Community member'}
      </T>
      <T variant="caption">
        {shortDate(blog.createdAt)} · {readMinutes(blog.content)} min read
      </T>
    </View>
  </View>
);

export const Stats = ({ blog }) => (
  <View style={styles.stats}>
    <View style={styles.stat} accessibilityLabel={`${blog.views || 0} views`}>
      <Eye size={14} color={colors.muted} />
      <T variant="caption">{blog.views || 0}</T>
    </View>
    <View style={styles.stat} accessibilityLabel={`${blog.reactions?.length || 0} reactions`}>
      <Heart size={14} color={colors.muted} />
      <T variant="caption">{blog.reactions?.length || 0}</T>
    </View>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
