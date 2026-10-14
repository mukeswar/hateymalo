import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { MessageSquare, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { timeAgo } from '../../lib/format';
import { Avatar, Button, Card, EmptyState, ErrorState, Loading, Row, Screen, T } from '../../components/ui';
import { ListGap, PanelIntro, SearchBar, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, space } from '../../theme';

// Comments moderation — SuperAdminDashboard "comments" tab.
export default function AdminCommentsScreen() {
  const { showToast } = useToast();
  const { data: comments, setData, loading, refreshing, error, reload, refresh } = useAdminList('/admin/comments');
  const [search, setSearch] = useState('');
  const [busy, run] = useBusy();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return comments;
    return comments.filter(
      (c) => c.content?.toLowerCase().includes(q) || c.author?.name?.toLowerCase().includes(q) || c.post?.title?.toLowerCase().includes(q)
    );
  }, [comments, search]);

  const remove = async (com) => {
    if (!(await confirm('Delete comment?', 'Delete comment permanently?', { confirmText: 'Delete' }))) return;
    await run(com._id, async () => {
      try {
        const res = await API.delete(`/admin/comments/${com._id}`);
        if (res.data.success) {
          showToast('Comment deleted', 'success');
          setData((prev) => prev.filter((c) => c._id !== com._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Delete comment failed'), 'error');
      }
    });
  };

  const renderItem = ({ item: com }) => (
    <Card style={{ gap: space.md }}>
      <Row gap={10}>
        <Avatar name={com.author?.name || 'Member'} src={com.author?.profilePicture} size="sm" />
        <View style={{ flex: 1 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }} numberOfLines={1}>{com.author?.name || 'Member'}</T>
          <T variant="caption">{timeAgo(com.createdAt)}</T>
        </View>
      </Row>
      <T variant="body" style={{ color: colors.ink }}>{com.content}</T>
      <Row style={{ justifyContent: 'space-between' }} gap={10}>
        <T
          variant="small"
          numberOfLines={2}
          style={{ flex: 1 }}
          onPress={com.post?._id ? () => router.push(`/post/${com.post._id}`) : undefined}
        >
          On: {com.post?.title || 'Post'}
        </T>
        <Button title="Delete" variant="danger" size="sm" icon={Trash2} loading={busy === com._id} disabled={!!busy} onPress={() => remove(com)} />
      </Row>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('comments').label }} />
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(c) => c._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro title="Comments moderation" count={comments.length} description="Monitor and remove abusive or spam comments." />
            {comments.length > 0 ? <SearchBar value={search} onChange={setSearch} placeholder="Search comments…" /> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={comments.length > 0 ? 'No matches' : 'No comments to moderate'}
              message={comments.length > 0 ? 'No comments match this search.' : 'Comments members leave on posts will appear here.'}
            />
          )
        }
      />
    </Screen>
  );
}
