import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { BookOpen, CheckCircle2, Trash2, X } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { formatDate } from '../../lib/format';
import { Button, Card, ChipBar, EmptyState, ErrorState, Loading, Row, Screen, StatusChip, T } from '../../components/ui';
import RejectionModal from '../../components/RejectionModal';
import { FeatureButton, ListGap, PanelIntro, PlainChip, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, radius, space } from '../../theme';

const STATUS_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

// Blogs & stories moderation — SuperAdminDashboard "blogs" tab.
export default function AdminBlogsScreen() {
  const { can } = useAuth();
  const { showToast } = useToast();
  const { data: blogs, setData, loading, refreshing, error, reload, refresh } = useAdminList('/blogs?status=ALL');
  const [status, setStatus] = useState('All');
  const [rejecting, setRejecting] = useState(null);
  const [busy, run] = useBusy();

  const filtered = useMemo(() => blogs.filter((b) => status === 'All' || b.status === status), [blogs, status]);

  const approve = (blogId) =>
    run(`approve-${blogId}`, async () => {
      try {
        const res = await API.put(`/blogs/${blogId}/status`, { status: 'APPROVED' });
        if (res.data.success) {
          showToast('Blog story published live!', 'success');
          setData((prev) => prev.map((b) => (b._id === blogId ? { ...b, status: 'APPROVED' } : b)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Approve blog failed'), 'error');
      }
    });

  const reject = async (reason) => {
    const blog = rejecting;
    setRejecting(null);
    if (!blog) return;
    await run(`reject-${blog._id}`, async () => {
      try {
        const res = await API.put(`/blogs/${blog._id}/status`, { status: 'REJECTED', rejectionReason: reason });
        if (res.data.success) {
          showToast('Blog rejected', 'info');
          setData((prev) => prev.map((b) => (b._id === blog._id ? { ...b, status: 'REJECTED', rejectionReason: reason } : b)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Reject blog failed'), 'error');
      }
    });
  };

  // Web sends no body: the endpoint toggles the flag.
  const feature = (blog) =>
    run(`feature-${blog._id}`, async () => {
      const next = !blog.isFeatured;
      try {
        const res = await API.put(`/blogs/${blog._id}/feature`);
        if (res.data.success) {
          showToast(next ? 'Blog featured' : 'Blog removed from featured', 'success');
          setData((prev) => prev.map((b) => (b._id === blog._id ? { ...b, isFeatured: next } : b)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Feature blog failed'), 'error');
      }
    });

  const remove = async (blog) => {
    if (!(await confirm('Delete story?', 'Delete this blog story permanently?', { confirmText: 'Delete' }))) return;
    await run(`delete-${blog._id}`, async () => {
      try {
        const res = await API.delete(`/blogs/${blog._id}`);
        if (res.data.success) {
          showToast('Blog deleted', 'success');
          setData((prev) => prev.filter((b) => b._id !== blog._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Delete blog failed'), 'error');
      }
    });
  };

  const renderItem = ({ item: blog }) => (
    <Card style={{ gap: space.md }}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        {blog.coverImage ? (
          <Image source={{ uri: blog.coverImage }} style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.paperDeep }} contentFit="cover" />
        ) : null}
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="semibold" numberOfLines={2} onPress={() => router.push(`/blog/${blog._id}`)} accessibilityRole="link">
            {blog.title}
          </T>
          <Row wrap gap={6}>
            <StatusChip status={blog.status} />
            <PlainChip label={blog.category} />
          </Row>
        </View>
      </Row>
      <T variant="caption">
        By {blog.author?.name || 'Author'} · {formatDate(blog.createdAt)}
      </T>
      {blog.status === 'REJECTED' && blog.rejectionReason ? (
        <T variant="caption" style={{ color: colors.brand }}>Reason: {blog.rejectionReason}</T>
      ) : null}
      <Row wrap gap={8}>
        {blog.status !== 'APPROVED' ? (
          <Button title="Approve" variant="pine" size="sm" icon={CheckCircle2} loading={busy === `approve-${blog._id}`} disabled={!!busy} onPress={() => approve(blog._id)} />
        ) : null}
        {blog.status === 'PENDING' ? (
          <Button title="Reject" variant="ghost" size="sm" icon={X} loading={busy === `reject-${blog._id}`} disabled={!!busy} onPress={() => setRejecting(blog)} />
        ) : null}
        {blog.status === 'APPROVED' ? <FeatureButton featured={blog.isFeatured} disabled={!!busy} onPress={() => feature(blog)} /> : null}
        {can('canDeletePosts') ? (
          <Button title="Delete" variant="danger" size="sm" icon={Trash2} loading={busy === `delete-${blog._id}`} disabled={!!busy} onPress={() => remove(blog)} />
        ) : null}
      </Row>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('blogs').label }} />
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(b) => b._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro title="Stories & blog submissions" count={blogs.length} description="Moderate community stories and editorial blogs." />
            <ChipBar options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ paddingHorizontal: 0 }} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState
              icon={BookOpen}
              title={blogs.length > 0 ? 'No matches' : 'No stories yet'}
              message={blogs.length > 0 ? 'No stories with this status.' : 'No blog stories have been submitted yet.'}
            />
          )
        }
      />
      <RejectionModal isOpen={!!rejecting} onClose={() => setRejecting(null)} onConfirm={reject} postTitle={rejecting?.title} />
    </Screen>
  );
}
