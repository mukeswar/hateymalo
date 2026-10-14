import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { CheckCircle2, Download, FileText, MapPin, Trash2, X } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, StatusChip, T } from '../../components/ui';
import RejectionModal from '../../components/RejectionModal';
import { exportCSV, FeatureButton, ListGap, PanelIntro, PlainChip, SearchBar, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, radius, space } from '../../theme';

const STATUS_OPTIONS = [
  { value: 'All', label: 'All statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Posts moderation — SuperAdminDashboard "posts" tab.
export default function AdminPostsScreen() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data: posts, setData, loading, refreshing, error, reload, refresh } = useAdminList('/posts?status=ALL');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [rejecting, setRejecting] = useState(null);
  const [busy, run] = useBusy();

  const filtered = useMemo(
    () =>
      posts.filter((p) => {
        const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = status === 'All' || p.status === status;
        return matchSearch && matchStatus;
      }),
    [posts, search, status]
  );

  const approve = (postId) =>
    run(`approve-${postId}`, async () => {
      try {
        const res = await API.put(`/posts/${postId}/status`, { status: 'APPROVED' });
        if (res.data.success) {
          showToast('Post approved and published live!', 'success');
          setData((prev) => prev.map((p) => (p._id === postId ? { ...p, status: 'APPROVED' } : p)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Approve post failed'), 'error');
      }
    });

  const reject = async (reason) => {
    const post = rejecting;
    setRejecting(null);
    if (!post) return;
    await run(`reject-${post._id}`, async () => {
      try {
        const res = await API.put(`/posts/${post._id}/status`, { status: 'REJECTED', rejectionReason: reason });
        if (res.data.success) {
          showToast('Post rejected with user feedback', 'info');
          setData((prev) => prev.map((p) => (p._id === post._id ? { ...p, status: 'REJECTED', rejectionReason: reason } : p)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Reject post failed'), 'error');
      }
    });
  };

  const feature = (post) =>
    run(`feature-${post._id}`, async () => {
      const makeFeatured = !post.isFeatured;
      try {
        const res = await API.put(`/posts/${post._id}/feature`, { isFeatured: makeFeatured });
        if (res.data.success) {
          showToast(makeFeatured ? 'Post featured on homepage' : 'Post removed from featured', 'success');
          setData((prev) => prev.map((p) => (p._id === post._id ? { ...p, isFeatured: res.data.data.isFeatured } : p)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Feature action failed'), 'error');
      }
    });

  const remove = async (post) => {
    if (!(await confirm('Delete post?', 'Are you sure you want to permanently delete this post?', { confirmText: 'Delete' }))) return;
    await run(`delete-${post._id}`, async () => {
      try {
        const res = await API.delete(`/posts/${post._id}`);
        if (res.data.success) {
          showToast('Post deleted permanently', 'success');
          setData((prev) => prev.filter((p) => p._id !== post._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Delete post failed'), 'error');
      }
    });
  };

  const renderItem = ({ item: post }) => (
    <Card style={{ gap: space.md }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        {post.images?.[0] ? (
          <Image source={{ uri: post.images[0] }} style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.paperDeep }} contentFit="cover" />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="semibold" numberOfLines={2} onPress={() => router.push(`/post/${post._id}`)} accessibilityRole="link">
            {post.title}
          </T>
          <Row wrap gap={6}>
            <StatusChip status={post.status} />
            <PlainChip label={post.category} />
          </Row>
        </View>
      </Row>
      <View style={{ gap: 4 }}>
        {post.location ? (
          <Row gap={6} style={{ alignItems: 'flex-start' }}>
            <MapPin size={14} color={colors.muted} style={{ marginTop: 3 }} />
            <T variant="small" numberOfLines={2} style={{ flex: 1 }}>{post.location}</T>
          </Row>
        ) : null}
        <T variant="caption">By {post.creator?.name || 'Member'}</T>
        {post.status === 'REJECTED' && post.rejectionReason ? (
          <T variant="caption" style={{ color: colors.brand }}>Reason: {post.rejectionReason}</T>
        ) : null}
      </View>
      <Row wrap gap={8}>
        {post.status !== 'APPROVED' ? (
          <Button title="Approve" variant="pine" size="sm" icon={CheckCircle2} loading={busy === `approve-${post._id}`} disabled={!!busy} onPress={() => approve(post._id)} />
        ) : null}
        {post.status === 'PENDING' ? (
          <Button title="Reject" variant="ghost" size="sm" icon={X} loading={busy === `reject-${post._id}`} disabled={!!busy} onPress={() => setRejecting(post)} />
        ) : null}
        {post.status === 'APPROVED' ? (
          <FeatureButton featured={post.isFeatured} disabled={!!busy} onPress={() => feature(post)} />
        ) : null}
        {can('canDeletePosts') ? (
          <Button title="Delete" variant="danger" size="sm" icon={Trash2} loading={busy === `delete-${post._id}`} disabled={!!busy} onPress={() => remove(post)} />
        ) : null}
      </Row>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('posts').label }} />
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(p) => p._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro
              title="Community help posts"
              count={posts.length}
              description="Manage approved, pending and rejected mutual-aid posts."
              right={
                <Button title="CSV" variant="ghost" size="sm" icon={Download} onPress={() => exportCSV(posts, 'hateymalo_posts', showToast)} accessibilityLabel="Export CSV" />
              }
            />
            <SearchBar value={search} onChange={setSearch} placeholder="Search posts by title…" />
            <ChipBar options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ paddingHorizontal: 0 }} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState icon={FileText} title={posts.length > 0 ? 'No matches' : 'No posts yet'} message={posts.length > 0 ? 'No posts match this search or filter.' : 'Posts members submit will appear here.'} />
          )
        }
      />
      <RejectionModal isOpen={!!rejecting} onClose={() => setRejecting(null)} onConfirm={reject} postTitle={rejecting?.title} />
    </Screen>
  );
}
