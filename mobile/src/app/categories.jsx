import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  HeartHandshake,
  LayoutGrid,
  Megaphone,
  MoreHorizontal,
  Smile,
  Sparkles,
  Trash2,
  Trees,
  Users,
} from 'lucide-react-native';
import API from '../lib/api';
import { Card, Chip, EmptyState, Row, Screen, Skeleton, T } from '../components/ui';
import { colors, fonts, space } from '../theme';

// Port of frontend/src/pages/Categories.jsx.
const CATEGORY_ICONS = {
  HeartHandshake,
  BookOpen,
  GraduationCap,
  FileText,
  Sparkles,
  Trash2,
  Trees,
  Users,
  Smile,
  Megaphone,
  Briefcase,
  MoreHorizontal,
};

const TONES = [
  { bg: colors.brandTint, fg: colors.brand },
  { bg: colors.pineTint, fg: colors.pine },
  { bg: colors.marigoldTint, fg: colors.marigoldText },
  { bg: colors.skyTint, fg: colors.sky },
];

const Header = () => (
  <View style={{ gap: 8, paddingBottom: space.sm }}>
    <Row gap={6}>
      <LayoutGrid size={14} color={colors.brand} />
      <T variant="eyebrow">Causes</T>
      <T variant="eyebrowDeva" style={{ color: colors.inkSoft }}>· सरोकारहरू</T>
    </Row>
    <T variant="display">Pick a cause close to your heart</T>
    <T style={{ color: colors.muted }}>
      From riverbank clean-ups to homework help, every cause gathers the requests people have shared. Choose one to see where you can pitch in.
    </T>
  </View>
);

export default function CategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await API.get('/categories?activeOnly=true');
      if (res.data.success) setCategories(res.data.data);
    } catch {
      /* empty state below */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  const renderItem = ({ item: cat, index }) => {
    const Icon = CATEGORY_ICONS[cat.icon] || HeartHandshake;
    const tone = TONES[index % TONES.length];
    const count = cat.postCount || 0;
    return (
      <Card
        onPress={() => router.push({ pathname: '/explore', params: { category: cat.name } })}
        accessibilityLabel={`${cat.name}, ${count} requests`}
        style={{ gap: space.lg }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={[styles.icon, { backgroundColor: tone.bg }]}>
            <Icon size={26} color={tone.fg} />
          </View>
          <Chip label={`${count} ${count === 1 ? 'request' : 'requests'}`} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} />
        </View>
        <View style={{ gap: 4 }}>
          <T variant="h2">{cat.name}</T>
          <T variant="small" numberOfLines={3}>{cat.description || 'Community help and collaboration requests.'}</T>
        </View>
        <View style={styles.footer}>
          <T style={{ fontFamily: fonts.semibold, fontSize: 14.5, color: colors.brand }}>See requests</T>
          <ArrowRight size={16} color={colors.brand} />
        </View>
      </Card>
    );
  };

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : categories}
        keyExtractor={(c) => c._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 }}
        ListHeaderComponent={Header}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: space.lg }}>
              {[1, 2, 3].map((n) => <Skeleton key={n} height={190} radius={20} />)}
            </View>
          ) : (
            <Card>
              <EmptyState
                icon={LayoutGrid}
                title="No causes to show right now"
                message="You can still browse every open help request."
                action="Browse help requests"
                onAction={() => router.push('/explore')}
              />
            </Card>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.sand, paddingTop: space.md },
});
