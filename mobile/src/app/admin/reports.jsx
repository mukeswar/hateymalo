import React, { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { AlertTriangle, Ban, Check, ShieldCheck, Trash2, UserX } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { formatDate, humanize } from '../../lib/format';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, T } from '../../components/ui';
import { ListGap, PanelIntro, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, radius, space } from '../../theme';

// Same actions and default notes as the web's report row (SuperAdminDashboard "reports").
const ACTIONS = {
  WARN_USER: { label: 'Warn user', note: 'Please review community guidelines', confirmText: 'Send warning' },
  REMOVE_CONTENT: { label: 'Remove content', note: '', confirmText: 'Remove content' },
  SUSPEND_USER: { label: 'Suspend user', note: 'Repeated reported safety violations', confirmText: 'Suspend user' },
  BAN_USER: { label: 'Ban user', note: 'Severe or repeated policy violations', confirmText: 'Ban permanently' },
};

const HINTS = {
  WARN_USER: 'The owner gets an official warning notification with this note.',
  REMOVE_CONTENT: 'The reported content is deleted and its owner is told why.',
  SUSPEND_USER: 'The owner’s account is suspended with this reason.',
  BAN_USER: 'Permanently bans the owner. This blocks all access.',
};

const targetHref = (r) => {
  if (!r.targetDoc) return null;
  if (r.targetType === 'POST') return `/post/${r.targetId}`;
  if (r.targetType === 'BLOG') return `/blog/${r.targetId}`;
  if (r.targetType === 'USER') return `/profile/${r.targetId}`;
  return null;
};

// Safety & moderation reports — SuperAdminDashboard "reports" tab.
export default function AdminReportsScreen() {
  const { showToast } = useToast();
  const { data: reports, setData, loading, refreshing, error, reload, refresh } = useAdminList('/reports');
  const [busy, run] = useBusy();
  const [pending, setPending] = useState(null); // { report, action }
  const [note, setNote] = useState('');

  const resolve = (report, action, reasonNote = '') =>
    run(`${action}-${report._id}`, async () => {
      try {
        const res = await API.put(`/reports/${report._id}/resolve`, { action, reasonNote });
        if (res.data.success) {
          showToast(res.data.message, 'success');
          setData((prev) => prev.filter((r) => r._id !== report._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Resolve report failed'), 'error');
      }
    });

  const openAction = (report, action) => {
    setNote(ACTIONS[action].note);
    setPending({ report, action });
  };

  const submitAction = async () => {
    if (!pending) return;
    const { report, action } = pending;
    if (action === 'BAN_USER' && !(await confirm('Ban this user?', 'Permanently BAN this user? This blocks all access.', { confirmText: 'Ban' }))) return;
    setPending(null);
    await resolve(report, action, note.trim());
  };

  const renderItem = ({ item: r }) => {
    const href = targetHref(r);
    const content = r.targetDoc?.title || r.targetDoc?.name || r.targetDoc?.content || r.targetId;
    return (
      <Card style={{ gap: space.md, borderLeftWidth: 4, borderLeftColor: colors.brand }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Chip label={`Reported ${humanize(r.targetType)}`} icon={AlertTriangle} tone={{ bg: colors.brandTint, fg: colors.brand }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
          <T variant="caption">{formatDate(r.createdAt)}</T>
        </Row>
        <T variant="caption">
          By {r.reporter?.name || 'Member'}
          {r.reporter?.email ? ` · ${r.reporter.email}` : ''}
        </T>
        <View style={{ gap: 4 }}>
          <T variant="eyebrow" style={{ color: colors.muted }}>Reason</T>
          <View style={{ backgroundColor: colors.paperDeep, borderRadius: radius.sm, padding: space.md }}>
            <T variant="medium" style={{ color: colors.brand }}>{r.reason}</T>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <T variant="eyebrow" style={{ color: colors.muted }}>Reported content</T>
          <View style={{ borderWidth: 1, borderColor: colors.sand, borderRadius: radius.sm, padding: space.md }}>
            <T variant="semibold" numberOfLines={3} onPress={href ? () => router.push(href) : undefined}>
              {r.targetDoc ? content : 'This content no longer exists.'}
            </T>
          </View>
        </View>
        <Row wrap gap={8}>
          <Button title="Dismiss" variant="ghost" size="sm" icon={Check} loading={busy === `DISMISS-${r._id}`} disabled={!!busy} onPress={() => resolve(r, 'DISMISS')} />
          <Button title="Warn" variant="soft" size="sm" icon={ShieldCheck} disabled={!!busy} loading={busy === `WARN_USER-${r._id}`} onPress={() => openAction(r, 'WARN_USER')} />
          <Button title="Remove content" variant="danger" size="sm" icon={Trash2} disabled={!!busy} loading={busy === `REMOVE_CONTENT-${r._id}`} onPress={() => openAction(r, 'REMOVE_CONTENT')} />
          <Button title="Suspend" variant="danger" size="sm" icon={UserX} disabled={!!busy} loading={busy === `SUSPEND_USER-${r._id}`} onPress={() => openAction(r, 'SUSPEND_USER')} />
          <Button title="Ban" variant="primary" size="sm" icon={Ban} disabled={!!busy} loading={busy === `BAN_USER-${r._id}`} onPress={() => openAction(r, 'BAN_USER')} />
        </Row>
      </Card>
    );
  };

  const action = pending ? ACTIONS[pending.action] : null;

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('reports').label }} />
      <FlatList
        data={loading ? [] : reports}
        keyExtractor={(r) => r._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ marginBottom: space.lg }}>
            <PanelIntro title="Safety & moderation reports" count={reports.length} description="Review reported items and enforce community safety rules." />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState icon={ShieldCheck} title="Report queue is clear" message="No safety reports are waiting for review." />
          )
        }
      />
      <Sheet
        visible={!!pending}
        onClose={() => setPending(null)}
        title={action?.label || ''}
        footer={
          <>
            <Button title={action?.confirmText || 'Confirm'} onPress={submitAction} full />
            <Button title="Cancel" variant="ghost" onPress={() => setPending(null)} full />
          </>
        }
      >
        {pending ? <T variant="small">{HINTS[pending.action]}</T> : null}
        <Field
          label="Moderator note"
          multiline
          value={note}
          onChangeText={setNote}
          placeholder="Optional note sent with the action…"
          hint={pending?.action === 'BAN_USER' ? 'Stored as the ban reason on the account.' : 'Included in the notification to the content owner.'}
        />
      </Sheet>
    </Screen>
  );
}
