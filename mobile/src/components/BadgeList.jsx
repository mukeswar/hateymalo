import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Award, BookOpen, Heart, HandHeart, PenLine, Sparkles, Trees, Trophy } from 'lucide-react-native';
import API from '../lib/api';
import { colors, fonts, radius } from '../theme';
import { Card, Chip, Row, Skeleton, T } from './ui';

// Port of frontend/src/components/BadgeList.jsx — props: { userId }.
// Badges come from the API with an emoji icon; show a matching line icon instead.
const ICONS_BY_ID = {
  first_helper: Trophy,
  active_volunteer: HandHeart,
  environmental_hero: Trees,
  community_contributor: Heart,
  education_helper: BookOpen,
  active_writer: PenLine,
};

const ICONS_BY_EMOJI = {
  '🏆': Trophy,
  '🤝': HandHeart,
  '🌳': Trees,
  '❤️': Heart,
  '❤': Heart,
  '📚': BookOpen,
  '📝': PenLine,
};

const stripEmoji = (s = '') =>
  String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').trim();

const BadgeList = ({ userId }) => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchBadges = async () => {
      try {
        const res = await API.get(`/badges/user/${userId}`);
        if (alive && res.data?.success) setBadges(res.data.data || []);
      } catch {
        /* badges are decorative; show the empty state */
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (userId) fetchBadges();
    else setLoading(false);
    return () => { alive = false; };
  }, [userId]);

  if (loading) {
    return (
      <View style={{ gap: 10 }} accessibilityElementsHidden>
        <Skeleton height={72} radius={radius.card} />
        <Skeleton height={72} radius={radius.card} />
      </View>
    );
  }

  if (badges.length === 0) {
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          backgroundColor: colors.paperDeep,
          borderRadius: radius.card,
          padding: 16,
        }}
      >
        <View style={iconWrap(40, 20)}>
          <Sparkles size={20} color={colors.marigoldText} />
        </View>
        <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>
          No badges yet. Badges are earned by joining help requests, events and community drives.
        </T>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Row gap={8}>
        <Award size={16} color={colors.marigoldText} />
        <T variant="semibold" style={{ fontSize: 14, color: colors.inkSoft }}>Badges earned</T>
        <Chip
          label={String(badges.length)}
          tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }}
          style={{ paddingVertical: 2, paddingHorizontal: 9 }}
        />
      </Row>
      {badges.map((b) => {
        const Icon = ICONS_BY_ID[b.id] || ICONS_BY_EMOJI[b.icon] || Award;
        return (
          <Card key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }} padded={false}>
            <View style={iconWrap(44, 16)}>
              <Icon size={20} color={colors.marigoldText} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.semibold, fontSize: 14.5, color: colors.ink }}>{stripEmoji(b.title)}</T>
              {b.description ? <T variant="caption" style={{ marginTop: 2 }}>{b.description}</T> : null}
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const iconWrap = (size, r) => ({
  width: size,
  height: size,
  borderRadius: r,
  backgroundColor: colors.marigoldTint,
  alignItems: 'center',
  justifyContent: 'center',
});

export { BadgeList };
export default BadgeList;
