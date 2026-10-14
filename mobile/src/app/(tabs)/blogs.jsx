import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowRight, BookOpen, Clock, PenLine, Search, Sparkles } from 'lucide-react-native';
import API from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors, space } from '../../theme';
import { T, Button, Card, ChipBar, Divider, Field, Row, Screen, Skeleton } from '../../components/ui';
import { BLOG_FILTERS, BlogCover, Byline, Pill, Stats, plain } from '../../components/blogs/BlogBits';

// Port of frontend/src/pages/Blogs.jsx

const LeadStory = ({ blog }) => (
  <Card padded={false} style={{ overflow: 'hidden' }} onPress={() => router.push(`/blog/${blog._id}`)} accessibilityLabel={blog.title}>
    <BlogCover uri={blog.coverImage} height={220} />
    <View style={{ padding: space.lg, gap: space.md }}>
      <Row gap={6} wrap>
        {blog.isFeatured ? <Pill label="Featured story" icon={Sparkles} bg={colors.marigoldTint} fg={colors.marigoldText} /> : null}
        {blog.category ? <Pill label={blog.category} bg={colors.paperDeep} fg={colors.inkSoft} /> : null}
      </Row>
      <T variant="display" style={{ fontSize: 28, lineHeight: 34 }}>{blog.title}</T>
      <T variant="body" style={{ color: colors.muted }} numberOfLines={4}>{plain(blog.content)}</T>
      <Divider />
      <View style={styles.footer}>
        <Byline blog={blog} />
        <Stats blog={blog} />
      </View>
      <Row gap={6}>
        <T variant="semibold">Read the story</T>
        <ArrowRight size={16} color={colors.ink} />
      </Row>
    </View>
  </Card>
);

const StoryCard = ({ blog }) => (
  <Card padded={false} style={{ overflow: 'hidden' }} onPress={() => router.push(`/blog/${blog._id}`)} accessibilityLabel={blog.title}>
    <BlogCover uri={blog.coverImage} height={190} />
    <View style={styles.cardChips}>
      {blog.isFeatured ? <Pill label="Featured" icon={Sparkles} bg={colors.marigoldTint} fg={colors.marigoldText} elevated /> : null}
      {blog.category ? <Pill label={blog.category} bg="rgba(255,255,255,0.95)" fg={colors.ink} elevated /> : null}
    </View>
    <View style={{ padding: space.lg, gap: 10 }}>
      <T variant="h2" numberOfLines={2}>{blog.title}</T>
      <T variant="small" numberOfLines={3}>{plain(blog.content)}</T>
      <Divider style={{ marginTop: 4 }} />
      <View style={styles.footer}>
        <Byline blog={blog} />
        <Stats blog={blog} />
      </View>
    </View>
  </Card>
);

export default function BlogsScreen() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const firstFocus = useRef(true);
  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchBlogs = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const params = {};
        if (searchRef.current) params.search = searchRef.current;
        if (category && category !== 'All') params.category = category;
        const res = await API.get('/blogs', { params });
        if (res.data.success) setBlogs(res.data.data);
      } catch (error) {
        console.error('Failed to fetch blogs:', error?.message);
      } finally {
        setLoading(false);
      }
    },
    [category],
  );

  // Re-fetch whenever the category changes (search runs on submit, like the website).
  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      fetchBlogs({ silent: true });
    }, [fetchBlogs]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBlogs({ silent: true });
    setRefreshing(false);
  };

  const writeStory = () => router.push(user ? '/create-blog' : '/login');

  // Lead with a featured story when there is one, otherwise the newest story.
  const lead = blogs.find((b) => b.isFeatured) || blogs[0];
  const rest = lead ? blogs.filter((b) => b._id !== lead._id) : [];

  const header = (
    <View style={{ gap: space.lg }}>
      <View style={{ gap: 8, paddingTop: space.sm }}>
        <Row gap={6}>
          <BookOpen size={15} color={colors.brand} />
          <T variant="eyebrow">Stories ·</T>
          <T variant="eyebrowDeva">कथाहरू</T>
        </Row>
        <T variant="display">Stories from hand to hand</T>
        <T variant="body" style={{ color: colors.muted }}>
          First-hand accounts of mutual aid, volunteering and community work, written by people across Nepal.
        </T>
        <Button title="Write a story" icon={PenLine} onPress={writeStory} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
      </View>

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search stories"
        returnKeyType="search"
        onSubmitEditing={() => fetchBlogs()}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search stories"
        inputStyle={{ minHeight: 44 }}
        right={
          <Pressable onPress={() => fetchBlogs()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Search">
            <Search size={18} color={colors.muted} />
          </Pressable>
        }
      />

      <ChipBar
        options={BLOG_FILTERS.map((c) => ({ value: c, label: c === 'All' ? 'All stories' : c }))}
        value={category}
        onChange={setCategory}
        style={{ paddingHorizontal: 0 }}
      />

      {!loading && lead ? <LeadStory blog={lead} /> : null}

      {!loading && rest.length > 0 ? (
        <Row gap={12}>
          <T variant="h1">More stories</T>
          <View style={{ height: 1, flex: 1, backgroundColor: colors.sand }} />
        </Row>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <View style={{ gap: space.lg }} accessibilityLabel="Loading stories">
      <Skeleton height={320} radius={20} />
      <Skeleton height={260} radius={20} />
    </View>
  ) : !lead ? (
    <Card style={{ alignItems: 'center', gap: 10, paddingVertical: space.xxl }}>
      <View style={styles.emptyIcon}>
        <Clock size={26} color={colors.muted} />
      </View>
      <T variant="h2" style={{ textAlign: 'center' }}>No stories here yet</T>
      <T variant="small" style={{ textAlign: 'center' }}>
        {search || category !== 'All'
          ? 'Nothing matches your search or filter. Try another category, or be the one to write it.'
          : 'Every community has stories worth telling. Yours could be the first one here.'}
      </T>
      <Button title="Write a story" icon={PenLine} onPress={writeStory} style={{ marginTop: 6 }} />
    </Card>
  ) : null;

  return (
    <Screen scroll={false}>
      <FlatList
        data={loading ? [] : rest}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <StoryCard blog={item} />}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: space.lg }}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: space.lg }} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardChips: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
