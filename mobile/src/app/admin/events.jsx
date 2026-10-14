import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ban, Calendar, Clock, MapPin, Plus, Trash2, Users } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { confirm } from '../../lib/confirm';
import { formatDate } from '../../lib/format';
import { Button, Card, Chip, EmptyState, ErrorState, Field, Loading, Row, Screen, Sheet, StatusChip, T } from '../../components/ui';
import { FeatureButton, ListGap, PanelIntro, useAdminList, useBusy } from '../../components/admin/content/kit';
import { colors, radius, space } from '../../theme';

const EMPTY_FORM = {
  title: '',
  description: '',
  location: 'Kathmandu, Nepal',
  date: '',
  startTime: '09:00 AM',
  endTime: '05:00 PM',
  maxParticipants: '50',
  category: 'Community Activity',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Official events — SuperAdminDashboard "events" tab + "Create official event" modal
// (also the moderator page's event form, which adds max participants).
export default function AdminEventsScreen() {
  const { showToast } = useToast();
  const params = useLocalSearchParams();
  const { data: events, setData, loading, refreshing, error, reload, refresh } = useAdminList('/events');
  const [busy, run] = useBusy();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick action on the admin hub opens the form directly (/admin/events?create=1)
  useEffect(() => {
    if (params.create) setShowForm(true);
  }, [params.create]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const createEvent = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.date.trim()) {
      setFormError('Title, description, location and date are required.');
      return;
    }
    if (!DATE_RE.test(form.date.trim()) || Number.isNaN(new Date(form.date.trim()).getTime())) {
      setFormError('Enter the date as YYYY-MM-DD.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const res = await API.post('/events', {
        ...form,
        date: form.date.trim(),
        maxParticipants: parseInt(form.maxParticipants, 10) || 50,
      });
      if (res.data.success) {
        showToast('Official event created!', 'success');
        setShowForm(false);
        setForm(EMPTY_FORM);
        reload();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Event creation failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ev) => {
    if (!(await confirm('Delete event?', 'Cancel & delete this official event?', { confirmText: 'Delete' }))) return;
    await run(`delete-${ev._id}`, async () => {
      try {
        const res = await API.delete(`/events/${ev._id}`);
        if (res.data.success) {
          showToast('Event deleted', 'success');
          setData((prev) => prev.filter((e) => e._id !== ev._id));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Delete event failed'), 'error');
      }
    });
  };

  const feature = (ev) =>
    run(`feature-${ev._id}`, async () => {
      const next = !ev.isFeatured;
      try {
        const res = await API.put(`/events/${ev._id}/feature`, { isFeatured: next });
        if (res.data.success) {
          showToast(next ? 'Event featured on homepage' : 'Event removed from featured', 'success');
          setData((prev) => prev.map((e) => (e._id === ev._id ? { ...e, isFeatured: next } : e)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Feature event failed'), 'error');
      }
    });

  const cancel = async (ev) => {
    if (!(await confirm('Cancel event?', 'Participants will be notified and it will show as CANCELLED.', { confirmText: 'Cancel event' }))) return;
    await run(`cancel-${ev._id}`, async () => {
      try {
        const res = await API.put(`/events/${ev._id}`, { status: 'CANCELLED' });
        if (res.data.success) {
          showToast('Event cancelled — participants notified', 'info');
          setData((prev) => prev.map((e) => (e._id === ev._id ? { ...e, status: 'CANCELLED' } : e)));
        }
      } catch (err) {
        showToast(errorMessage(err, 'Cancel event failed'), 'error');
      }
    });
  };

  const renderItem = ({ item: ev }) => (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      {ev.coverImage ? (
        <Image source={{ uri: ev.coverImage }} style={{ width: '100%', height: 120, backgroundColor: colors.paperDeep }} contentFit="cover" />
      ) : null}
      <View style={{ padding: space.lg, gap: space.md }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Row wrap gap={6} style={{ flex: 1 }}>
            <StatusChip status={ev.status} />
            {ev.isFeatured ? <Chip label="Featured" tone={{ bg: colors.marigoldTint, fg: colors.marigoldText }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} /> : null}
          </Row>
          <Button
            variant="text"
            size="sm"
            icon={Trash2}
            accessibilityLabel={`Delete event ${ev.title}`}
            loading={busy === `delete-${ev._id}`}
            disabled={!!busy}
            onPress={() => remove(ev)}
          />
        </Row>
        <View style={{ gap: 4 }}>
          <T variant="h3" onPress={() => router.push(`/event/${ev._id}`)} accessibilityRole="link">{ev.title}</T>
          {ev.description ? <T variant="small" numberOfLines={2}>{ev.description}</T> : null}
        </View>
        <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colors.sand, paddingTop: space.md }}>
          <Row gap={6} wrap>
            <Calendar size={15} color={colors.muted} />
            <T variant="small" style={{ color: colors.inkSoft }}>{formatDate(ev.date)}</T>
            <T variant="small">·</T>
            <Clock size={15} color={colors.muted} />
            <T variant="small" style={{ color: colors.inkSoft }}>{ev.startTime} – {ev.endTime}</T>
          </Row>
          <Row gap={6}>
            <MapPin size={15} color={colors.muted} />
            <T variant="small" numberOfLines={1} style={{ flex: 1, color: colors.inkSoft }}>{ev.location}</T>
          </Row>
          <Row gap={6}>
            <Users size={15} color={colors.muted} />
            <T variant="semibold" style={{ fontSize: 14 }}>
              {ev.joinedUsers?.length || 0} / {ev.maxParticipants} registered
            </T>
          </Row>
        </View>
        <Row wrap gap={8}>
          <FeatureButton featured={ev.isFeatured} disabled={!!busy} onPress={() => feature(ev)} />
          {ev.status !== 'CANCELLED' ? (
            <Button title="Cancel event" variant="ghost" size="sm" icon={Ban} loading={busy === `cancel-${ev._id}`} disabled={!!busy} onPress={() => cancel(ev)} />
          ) : null}
        </Row>
      </View>
    </Card>
  );

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: findSection('events').label }} />
      <FlatList
        data={loading ? [] : events}
        keyExtractor={(e) => e._id}
        renderItem={renderItem}
        ItemSeparatorComponent={ListGap}
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <PanelIntro title="Official events" count={events.length} description="Manage official platform events and participant rosters." />
            <Button title="Create official event" icon={Plus} onPress={() => setShowForm(true)} full />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState icon={Calendar} title="No official events yet" message="Create the first event — it will be listed publicly on the Events page." />
          )
        }
      />

      <Sheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        title="Create official event"
        footer={<Button title="Publish official event" icon={Calendar} onPress={createEvent} loading={saving} full />}
      >
        <T variant="small">Published events are listed publicly on the Events page.</T>
        <Field label="Event title *" value={form.title} onChangeText={set('title')} placeholder="e.g., Annual Kathmandu Clean River Summit 2026" />
        <Field label="Description *" multiline value={form.description} onChangeText={set('description')} placeholder="Event goals, agenda, meeting location details…" />
        <Field label="Location *" value={form.location} onChangeText={set('location')} />
        <Field label="Date *" value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" hint="Format: YYYY-MM-DD" autoCapitalize="none" keyboardType="numbers-and-punctuation" />
        <Row gap={12} style={{ alignItems: 'flex-start' }}>
          <Field label="Starts" value={form.startTime} onChangeText={set('startTime')} placeholder="09:00 AM" style={{ flex: 1 }} />
          <Field label="Ends" value={form.endTime} onChangeText={set('endTime')} placeholder="05:00 PM" style={{ flex: 1 }} />
        </Row>
        <Field label="Max participants" value={String(form.maxParticipants)} onChangeText={set('maxParticipants')} keyboardType="number-pad" hint="Minimum 10." />
        <Field label="Category" value={form.category} onChangeText={set('category')} />
        {formError ? (
          <View style={{ backgroundColor: colors.brandTint, borderRadius: radius.sm, padding: space.md }}>
            <T variant="small" style={{ color: colors.brand }}>{formError}</T>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
