import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { BookOpen, Check, Eye, Heart, PenLine, Share2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, fonts, radius, space } from '../../theme';
import { T, Avatar, Button, Divider, Row, Screen, Skeleton, EmptyState } from '../../components/ui';
import CommentSection from '../../components/CommentSection';
import { BlogCover, readMinutes } from '../../components/blogs/BlogBits';
import StoryBody from '../../components/blogs/StoryBody';
import { publicLink, shareLink } from '../../components/blogs/share';

// Port of frontend/src/pages/BlogDetails.jsx

export default function BlogDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);

  const fetchBlog = useCallback(async () => {
    try {
      const res = await API.get(`/blogs/${id}`);
      if (res.data.success) setBlog(res.data.data);
    } catch {
      showToast('Failed to load blog details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBlog();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={18} width={120} />
        <Skeleton height={40} />
        <Skeleton height={40} width="75%" />
        <Skeleton height={220} radius={20} />
      </Screen>
    );
  }

  if (!blog) {
    return (
      <Screen>
        <EmptyState
          icon={BookOpen}
          title="We couldn't find this story"
          message="It may have been removed or is still waiting for review."
          action="Back to stories"
          onAction={() => (router.canGoBack() ? router.back() : router.replace('/blogs'))}
        />
      </Screen>
    );
  }

  const { title, content, coverImage, category, author, reactions = [], views, createdAt } = blog;
  const hasReacted = !!user && reactions.some((r) => (r?._id || r) === user._id);
  const published = new Date(createdAt);
  const publishedLabel =
    !createdAt || Number.isNaN(published.getTime())
      ? ''
      : published.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleReactToggle = async () => {
    if (!user) {
      showToast('Please log in to react to stories', 'info');
      router.push('/login');
      return;
    }
    setActionLoading(true);
    try {
      const res = await API.post(`/blogs/${id}/react`);
      if (res.data.success) {
        showToast(res.data.message, 'success');
        fetchBlog();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Reaction failed'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareLink({ title, url: publicLink(`/blogs/${id}`, `/blog/${id}`) });
      if (result === 'copied') {
        setCopied(true);
        showToast('Blog link copied to clipboard!', 'success');
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      showToast('Could not share this story', 'error');
    }
  };

  const writeOwn = () => router.push(user ? '/create-blog' : '/login');

  const actions = (
    <Row gap={8} wrap>
      <Button
        size="sm"
        variant={hasReacted ? 'primary' : 'ghost'}
        icon={Heart}
        title={`${reactions.length} ${reactions.length === 1 ? 'Reaction' : 'Reactions'}`}
        onPress={handleReactToggle}
        disabled={actionLoading}
        accessibilityLabel={hasReacted ? 'Remove your reaction' : 'React to this story'}
      />
      <Button size="sm" variant="ghost" icon={copied ? Check : Share2} title={copied ? 'Link copied' : 'Share'} onPress={handleShare} />
    </Row>
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Story' }} />

      <View style={{ gap: 10 }}>
        {category ? <T variant="eyebrow">{category}</T> : null}
        <T variant="display" style={{ fontSize: 30, lineHeight: 37 }}>{title}</T>
      </View>

      <View style={{ gap: 14 }}>
        <Row gap={12}>
          {author ? <Avatar name={author.name} src={author.profilePicture} size="md" /> : null}
          <View style={{ flex: 1 }}>
            <T variant="semibold" numberOfLines={1}>{author?.name || 'Community member'}</T>
            <Row gap={4} wrap>
              <T variant="small">
                {publishedLabel ? `${publishedLabel} · ` : ''}
                {readMinutes(content)} min read ·
              </T>
              <Eye size={14} color={colors.muted} />
              <T variant="small">{views} views</T>
            </Row>
          </View>
        </Row>
        {actions}
        <Divider />
      </View>

      <BlogCover uri={coverImage} height={220} style={{ borderRadius: radius.card }} />

      <StoryBody content={content} />

      <View style={{ gap: 12, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: colors.sand }}>
        <T variant="small">Did this story move you? Let the author know.</T>
        {actions}
      </View>

      {author ? (
        <View style={styles.authorCard}>
          <Pressable
            onPress={() => author._id && router.push(`/profile/${author._id}`)}
            accessibilityRole="link"
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14 }, pressed && { opacity: 0.7 }]}
          >
            <Avatar name={author.name} src={author.profilePicture} size="lg" />
            <View style={{ flex: 1 }}>
              <T variant="caption" style={{ textTransform: 'uppercase', letterSpacing: 1, fontFamily: fonts.semibold }}>
                Written by
              </T>
              <T variant="h2">{author.name}</T>
            </View>
          </Pressable>
          <T variant="small" style={{ color: colors.inkSoft }}>{author.bio || 'Community contributor on HATEYMALO.'}</T>
          <Button title="Write your own" icon={PenLine} variant="ghost" size="sm" onPress={writeOwn} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}

      <CommentSection postId={id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  authorCard: {
    backgroundColor: colors.paperDeep,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 12,
  },
});
