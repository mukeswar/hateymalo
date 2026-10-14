import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { HandHeart, MapPin, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react-native';
import API from '../../lib/api';
import PostCard from '../../components/PostCard';
import { Button, Card, ChipBar, EmptyState, Field, Row, Screen, Segmented, Skeleton, T } from '../../components/ui';
import { colors, fonts, radius, shadow, space } from '../../theme';

// Port of frontend/src/pages/ExplorePosts.jsx. The API returns the whole filtered
// list, so the FlatList reveals it a page at a time as you scroll.
const PAGE_SIZE = 8;

const FALLBACK_CATEGORY_OPTIONS = [
  'All',
  'Help Request',
  'Education Support',
  'Assignment Guidance',
  'Writing Support',
  'Cleaning Campaign',
  'Street Cleaning',
  'Tree Plantation',
  'Social Help',
  'Community Activity',
  'Awareness Campaign',
  'Project Collaboration',
  'Other',
];

const STATUS_OPTIONS = [
  { value: 'APPROVED', label: 'Open' },
  { value: 'COMPLETED', label: 'Completed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export default function ExploreScreen() {
  const params = useLocalSearchParams();
  const paramCategory = typeof params.category === 'string' ? params.category : '';
  const paramSearch = typeof params.search === 'string' ? params.search : '';

  const [posts, setPosts] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState(FALLBACK_CATEGORY_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState(paramSearch);
  const [category, setCategory] = useState(paramCategory || 'All');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('newest');
  const [status, setStatus] = useState('APPROVED');
  const [reloadKey, setReloadKey] = useState(0);

  // Latest text filters, read at fetch time (the web refetches them on submit only).
  const textRef = useRef({ search, location });
  textRef.current = { search, location };

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/categories?activeOnly=true');
        if (res.data.success && res.data.data.length > 0) {
          setCategoryOptions(['All', ...res.data.data.map((c) => c.name)]);
        }
      } catch {
        /* keep fallback list */
      }
    })();
  }, []);

  // Follow /explore?category=… links from Categories/Home while this tab is mounted.
  useEffect(() => {
    if (paramCategory) setCategory(paramCategory);
  }, [paramCategory]);
  useEffect(() => {
    if (paramSearch) {
      setSearch(paramSearch);
      setReloadKey((k) => k + 1);
    }
  }, [paramSearch]);

  const fetchPosts = useCallback(async () => {
    const { search: s, location: l } = textRef.current;
    const q = new URLSearchParams();
    if (s) q.append('search', s);
    if (category && category !== 'All') q.append('category', category);
    if (l) q.append('location', l);
    if (sort) q.append('sort', sort);
    if (status) q.append('status', status);
    try {
      const res = await API.get(`/posts?${q.toString()}`);
      if (res.data.success) {
        setPosts(res.data.data);
        setVisible(PAGE_SIZE);
      }
    } catch {
      /* keep previous results */
    } finally {
      setLoading(false);
    }
  }, [category, sort, status]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts, reloadKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchPosts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('All');
    setLocation('');
    setSort('newest');
    setStatus('APPROVED');
    textRef.current = { search: '', location: '' };
    router.setParams({ category: undefined, search: undefined });
    setReloadKey((k) => k + 1);
  };

  const selectCategory = (cat) => {
    setCategory(cat);
    router.setParams({ category: cat === 'All' ? undefined : cat });
  };

  const hasActiveFilters = !!search || !!location || category !== 'All' || sort !== 'newest' || status !== 'APPROVED';
  const shown = useMemo(() => posts.slice(0, visible), [posts, visible]);

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.sm }}>
      <View style={{ paddingHorizontal: space.lg, gap: 6 }}>
        <Row gap={6}>
          <HandHeart size={14} color={colors.brand} />
          <T variant="eyebrow">Help requests</T>
          <T variant="eyebrowDeva" style={{ color: colors.inkSoft }}>· सहयोग अनुरोध</T>
        </Row>
        <T variant="h1">Find a way to lend a hand</T>
        <T variant="small">Browse requests from neighbours, students and community groups across Nepal — then join in where you can help.</T>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
        <Row>
          <Field
            style={{ flex: 1 }}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by keyword…"
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            accessibilityLabel="Search keyword"
            right={
              search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                  <X size={16} color={colors.muted} />
                </Pressable>
              ) : (
                <Search size={16} color={colors.muted} />
              )
            }
          />
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="More filters"
            accessibilityState={{ expanded: showFilters }}
            style={[styles.squareBtn, showFilters && { backgroundColor: colors.ink, borderColor: colors.ink }]}
          >
            <SlidersHorizontal size={18} color={showFilters ? colors.white : colors.ink} />
          </Pressable>
        </Row>

        {showFilters ? (
          <View style={styles.filterPanel}>
            <Field
              value={location}
              onChangeText={setLocation}
              placeholder="Location, e.g. Patan, Pokhara"
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              accessibilityLabel="Location"
              right={<MapPin size={16} color={colors.muted} />}
            />
            <T variant="semibold" style={{ fontSize: 14 }}>Status</T>
            <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            <T variant="semibold" style={{ fontSize: 14 }}>Sort order</T>
            <Segmented options={SORT_OPTIONS} value={sort} onChange={setSort} />
            <Row>
              <Button title="Search" icon={Search} style={{ flex: 1 }} onPress={handleSearchSubmit} />
              <Button title="Reset" icon={RotateCcw} variant="ghost" onPress={handleClearFilters} accessibilityLabel="Reset all filters" />
            </Row>
          </View>
        ) : null}
      </View>

      <ChipBar
        options={categoryOptions.map((c) => ({ value: c, label: c === 'All' ? 'All causes' : c }))}
        value={category}
        onChange={selectCategory}
      />

      <Row style={{ paddingHorizontal: space.lg, justifyContent: 'space-between' }} wrap>
        <T variant="small">
          {loading ? 'Looking for requests…' : (
            <>
              Showing <T style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 14 }}>{posts.length}</T>{' '}
              {posts.length === 1 ? 'request' : 'requests'}
            </>
          )}
        </T>
        {hasActiveFilters ? (
          <Pressable onPress={handleClearFilters} hitSlop={8} accessibilityRole="button">
            <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.brand }}>Clear all</T>
          </Pressable>
        ) : null}
      </Row>
    </View>
  );

  return (
    <Screen scroll={false} edges={[]}>
      <FlatList
        data={loading ? [] : shown}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => <View style={{ paddingHorizontal: space.lg }}><PostCard post={item} /></View>}
        ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: 110 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && visible < posts.length) setVisible((v) => v + PAGE_SIZE);
        }}
        ListFooterComponent={
          !loading && visible < posts.length ? (
            <T variant="small" style={{ textAlign: 'center', paddingTop: space.lg }}>Loading more…</T>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
              {[1, 2].map((n) => (
                <Card key={n} padded={false} style={{ overflow: 'hidden' }}>
                  <Skeleton height={190} radius={0} />
                  <View style={{ padding: space.lg, gap: 10 }}>
                    <Skeleton height={18} width="75%" />
                    <Skeleton height={14} />
                    <Skeleton height={8} />
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card style={{ marginHorizontal: space.lg }}>
              <EmptyState
                icon={Search}
                title="No requests match yet"
                message="Try a different keyword or place, or browse every cause. New requests are added by the community all the time."
              />
              <Row style={{ justifyContent: 'center' }} wrap>
                <Button title="Clear filters" icon={RotateCcw} onPress={handleClearFilters} />
                <Button title="Ask for help" variant="ghost" onPress={() => router.push('/create-post')} />
              </Row>
            </Card>
          )
        }
      />

      <Pressable
        onPress={() => router.push('/create-post')}
        accessibilityRole="button"
        accessibilityLabel="Ask for help — create a post"
        style={({ pressed }) => [styles.fab, pressed && { backgroundColor: colors.brandDark }]}
      >
        <Plus size={22} color={colors.white} />
        <T style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.white }}>Ask for help</T>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  squareBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sand,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: { backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.md, gap: 10 },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    ...shadow.lift,
  },
});
