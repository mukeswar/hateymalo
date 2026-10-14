import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Megaphone, Send } from 'lucide-react-native';
import API, { errorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { findSection } from '../../lib/adminAccess';
import { formatDate, timeAgo } from '../../lib/format';
import { Button, Card, Chip, Divider, EmptyState, Field, Loading, Row, Screen, Segmented, Select, T } from '../../components/ui';
import { PanelIntro } from '../../components/admin/content/kit';
import { colors, radius, space } from '../../theme';

const AUDIENCES = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'CATEGORY', label: 'Category' },
  { value: 'EVENT', label: 'Event' },
];

const AUDIENCE_HINT = {
  ALL: 'Sent to all members.',
  CATEGORY: 'Sent to members who list this category among their interests.',
  EVENT: 'Sent to members who joined or are interested in this event.',
};

// Announcements — the web's "Create announcement" modal (SuperAdminDashboard) and the
// moderator page's Broadcast tab, plus the audience targeting POST /announcements supports.
export default function AdminAnnouncementsScreen() {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('ALL');
  const [category, setCategory] = useState('');
  const [eventId, setEventId] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');

  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecent = async () => {
    try {
      const res = await API.get('/announcements');
      if (res.data.success) setRecent(res.data.data);
    } catch {
      // The list is informational; the form still works without it.
    } finally {
      setLoadingRecent(false);
      setRefreshing(false);
    }
  };

  const loadOptions = async () => {
    const [catRes, evRes] = await Promise.all([
      API.get('/categories?activeOnly=true').catch(() => null),
      API.get('/events').catch(() => null),
    ]);
    if (catRes?.data?.success) setCategories(catRes.data.data);
    if (evRes?.data?.success) setEvents(evRes.data.data.filter((e) => e.status !== 'CANCELLED'));
  };

  useEffect(() => {
    loadRecent();
    loadOptions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecent();
    loadOptions();
  };

  const broadcast = async () => {
    if (!title.trim() || !content.trim()) {
      setFormError('Title and message are required.');
      return;
    }
    if (target === 'CATEGORY' && !category) {
      setFormError('Choose the category to notify.');
      return;
    }
    if (target === 'EVENT' && !eventId) {
      setFormError('Choose the event to notify.');
      return;
    }
    setFormError('');
    setSending(true);
    try {
      // "Everyone" sends exactly the web payload; targeted sends add the audience fields.
      const payload = { title, content };
      if (target === 'CATEGORY') Object.assign(payload, { target, category });
      if (target === 'EVENT') Object.assign(payload, { target, eventId });
      const res = await API.post('/announcements', payload);
      if (res.data.success) {
        showToast(target === 'ALL' ? 'Announcement broadcast to all members!' : res.data.message, 'success');
        setTitle('');
        setContent('');
        loadRecent();
      }
    } catch (err) {
      showToast(errorMessage(err, 'Broadcast failed'), 'error');
    } finally {
      setSending(false);
    }
  };

  const audienceLabel = (a) => {
    if (a.target === 'CATEGORY') return `Category · ${a.category}`;
    if (a.target === 'EVENT') return 'Event participants';
    return 'Everyone';
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: findSection('announcements').label }} />
      <PanelIntro title="Broadcast an announcement" description="Announcements are delivered as notifications to the chosen audience." />

      <Card style={{ gap: space.lg }}>
        <Field label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Platform Maintenance Notice / Emergency Flood Relief Call" />
        <Field label="Message *" multiline value={content} onChangeText={setContent} placeholder="Message content…" />
        <View style={{ gap: 8 }}>
          <T variant="semibold" style={{ fontSize: 14.5 }}>Audience</T>
          <Segmented options={AUDIENCES} value={target} onChange={setTarget} />
          <T variant="small">{AUDIENCE_HINT[target]}</T>
        </View>
        {target === 'CATEGORY' ? (
          categories.length > 0 ? (
            <Select label="Category" options={categories.map((c) => ({ value: c.name, label: c.name }))} value={category} onChange={setCategory} />
          ) : (
            <T variant="small">No active categories.</T>
          )
        ) : null}
        {target === 'EVENT' ? (
          events.length > 0 ? (
            <Select
              label="Event"
              options={events.map((e) => ({ value: e._id, label: `${e.title} · ${formatDate(e.date, { day: 'numeric', month: 'short' })}` }))}
              value={eventId}
              onChange={setEventId}
            />
          ) : (
            <T variant="small">No upcoming events to target.</T>
          )
        ) : null}
        {formError ? (
          <View style={{ backgroundColor: colors.brandTint, borderRadius: radius.sm, padding: space.md }}>
            <T variant="small" style={{ color: colors.brand }}>{formError}</T>
          </View>
        ) : null}
        <Button title="Broadcast announcement" icon={Send} onPress={broadcast} loading={sending} full />
      </Card>

      <PanelIntro title="Recent announcements" />
      {loadingRecent ? (
        <Loading />
      ) : recent.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" message="Announcements you broadcast will be listed here." />
      ) : (
        <Card padded={false}>
          {recent.map((a, i) => (
            <View key={a._id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ padding: space.lg, gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }} gap={8}>
                  <T variant="semibold" style={{ flex: 1 }}>{a.title}</T>
                  <T variant="caption">{timeAgo(a.createdAt)}</T>
                </Row>
                <T variant="small" numberOfLines={3}>{a.content}</T>
                <Row wrap gap={6}>
                  <Chip label={audienceLabel(a)} tone={{ bg: colors.skyTint, fg: colors.sky }} style={{ paddingVertical: 3, paddingHorizontal: 10 }} />
                  {a.createdBy?.name ? <T variant="caption">by {a.createdBy.name}</T> : null}
                </Row>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
