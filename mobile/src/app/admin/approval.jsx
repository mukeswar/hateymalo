import React, { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { CheckCircle2, Clock, Inbox, X } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, plainText } from '../../lib/format';
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Loading, Row, Screen, Segmented, T } from '../../components/ui';
import RejectionModal from '../../components/RejectionModal';
import { ListGap, PanelIntro, PlainChip, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, space } from '../../theme';

// Approval center — SuperAdminDashboard "approval" tab (pending posts) merged with the
// moderator page's pending-blogs queue (AdminDashboard "blogs" tab).
export default function ApprovalScreen() {
  const { showToast } = useToast();
  const [kind, setKind] = useState('POSTS');
  const posts = useAdminList('/super-admin/approval-center?contentType=POSTS');
  const blogs = useAdminList('/super-admin/approval-center?contentType=BLOGS');
  const [rejecting, setRejecting] = useState(null); // { item, type }
  const [busy, run] = useBusy();

  const list = kind === 'POSTS' ? posts : blogs;

  const approve = (item, type) =>
    run(`approve-${item._id}`, async () => {
      try {
        const url = type === 'POST' ? `/posts/${item._id}/status` : `/blogs/${item._id}/status`;
        const res = await API.put(url, { status: 'APPROVED' });
        if (res.data.success) {
          showToast(type === 'POST' ? 'Post approved and published live!' : 'Blog story published live!', 'success');
          (type === 'POST' ? posts : blogs).setData((prev) => prev.filter((p) => p._id !== item._id));
        }
      } catch (err) {
        showToast(errorMessage(err, type === 'POST' ? 'Approve post failed' : 'Approve blog failed'), 'error');
      }
    });

  const reject = async (reason) => {
    if (!rejecting) return;
    const { item, type } = rejecting;
    setRejecting(null);
    await run(`reject-${item._id}`, async () => {
      try {
        const url = type === 'POST' ? `/posts/${item._id}/status` : `/blogs/${item._id}/status`;
        const res = await API.put(url, { status: 'REJECTED', rejectionReason: reason });
        if (res.data.success) {
          showToast(type === 'POST' ? 'Post rejected with user feedback' : 'Blog rejected', 'info');
          (type === 'POST' ? posts : blogs).setData((prev) => prev.filter((p) => p._id !== item._id));
        }
      } catch (err) {
        showToast(errorMessage(err, type === 'POST' ? 'Reject post failed' : 'Reject blog failed'), 'error');
      }
    });
  };

  const renderItem = ({ item }) => {
    const type = kind === 'POSTS' ? 'POST' : 'BLOG';
    const person = item.creator || item.author;
    const open = () => router.push(type === 'POST' ? `/post/${item._id}` : `/blog/${item._id}`);
    return (
      <Card style={{ gap: space.md }}>
        <Row wrap gap={6}>
          <Chip label="Pending review" icon={Clock} tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
          <PlainChip label={item.category} />
        </Row>
        <View style={{ gap: 4 }}>
          <T variant="h3" onPress={open} accessibilityRole="link">{item.title}</T>
          {item.description || item.content ? (
            <T variant="small" numberOfLines={2}>{plainText(item.description || item.content, 200)}</T>
          ) : null}
        </View>
        <Row gap={10}>
          <Avatar name={person?.name || 'Member'} src={person?.profilePicture} size="sm" />
          <View style={{ flex: 1 }}>
            <T variant="semibold" style={{ fontSize: 14.5 }} numberOfLines={1}>{person?.name || 'Member'}</T>
            <T variant="caption" numberOfLines={1}>
              {person?.email ? `${person.email} · ` : ''}Submitted {formatDate(item.createdAt)}
            </T>
          </View>
        </Row>
        <Row gap={8}>
          <Button
            title="Approve"
            variant="pine"
            size="sm"
            icon={CheckCircle2}
            loading={busy === `approve-${item._id}`}
            disabled={!!busy}
            onPress={() => approve(item, type)}
            style={{ flex: 1 }}
          />
          <Button
            title="Reject"
            variant="danger"
            size="sm"
            icon={X}
            loading={busy === `reject-${item._id}`}
            disabled={!!busy}
            onPress={() => setRejecting({ item, type })}
            style={{ flex: 1 }}
          />
        </Row>
      </Card>
    );
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('approval').label }} />
      <FlatList
        data={list.loading ? [] : list.data}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro
              title="Approval center"
              description="Review pending submissions before they are published publicly."
              right={
                <Chip
                  label={`${list.data.length} pending`}
                  tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }}
                  style={{ paddingVertical: 3, paddingHorizontal: 10 }}
                />
              }
            />
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                { value: 'POSTS', label: `Posts${posts.loading ? '' : ` (${posts.data.length})`}` },
                { value: 'BLOGS', label: `Blogs${blogs.loading ? '' : ` (${blogs.data.length})`}` },
              ]}
            />
          </View>
        }
        ListEmptyComponent={
          list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
          ) : (
            <EmptyState
              icon={Inbox}
              title="All caught up"
              message={kind === 'POSTS' ? 'The review queue is empty — every submission has been reviewed.' : 'New blog submissions will appear here for review.'}
            />
          )
        }
      />
      <RejectionModal
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={reject}
        postTitle={rejecting?.item?.title}
      />
    </Screen>
  );
}
