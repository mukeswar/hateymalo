import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Megaphone, Plus, Send, X } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Avatar, Button, Card, Field, Row, Skeleton, T } from './ui';
import { colors, radius, space } from '../theme';

// Port of frontend/src/components/PostUpdatesSection.jsx — `{ postId, isCreator }`.
const formatStamp = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const PostUpdatesSection = ({ postId, isCreator }) => {
  const { showToast } = useToast();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await API.get(`/interactions/posts/${postId}/updates`);
      if (res.data.success) setUpdates(res.data.data);
    } catch {
      /* keep current list */
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) fetchUpdates();
  }, [postId, fetchUpdates]);

  const handleSubmitUpdate = async () => {
    if (!content.trim()) {
      showToast('Please write the update first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post(`/interactions/posts/${postId}/updates`, { content: content.trim() });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setContent('');
        setShowForm(false);
        fetchUpdates();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Failed to post update'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ gap: space.lg }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={[styles.iconTile, { backgroundColor: colors.marigoldTint }]}>
          <Megaphone size={20} color={colors.marigoldText} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="h2">Updates from the organiser</T>
          <T variant="small">News, changes of plan and progress on this request.</T>
        </View>
      </View>

      {isCreator ? (
        <Button
          title={showForm ? 'Cancel' : 'Post update'}
          icon={showForm ? X : Plus}
          variant={showForm ? 'ghost' : 'primary'}
          size="sm"
          style={{ alignSelf: 'flex-start' }}
          onPress={() => setShowForm(!showForm)}
        />
      ) : null}

      {isCreator && showForm ? (
        <View style={styles.sunken}>
          <Field
            label="Share an update with everyone who joined or is interested"
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="e.g. The meeting point has moved to Patan Gate; we start at 7:30 AM."
          />
          <Button title="Post update" icon={Send} size="sm" loading={submitting} style={{ alignSelf: 'flex-end' }} onPress={handleSubmitUpdate} />
        </View>
      ) : null}

      {loading ? (
        <Skeleton height={64} radius={16} />
      ) : updates.length > 0 ? (
        <View style={{ gap: space.xl }}>
          {updates.map((up, i) => (
            <View key={up._id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 24 }}>
                <View style={styles.dot}>
                  <View style={styles.dotInner} />
                </View>
                {i < updates.length - 1 ? <View style={styles.line} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Row wrap gap={6}>
                  <Avatar name={up.author?.name || 'Organiser'} src={up.author?.profilePicture} size="xs" />
                  <T variant="semibold" style={{ fontSize: 14.5 }}>{up.author?.name}</T>
                  <T variant="caption">{formatStamp(up.createdAt)}</T>
                </Row>
                <T>{up.content}</T>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <T variant="small">
          {isCreator ? 'No updates yet. Post one to keep your helpers in the loop.' : 'No updates yet — the organiser will post news here.'}
        </T>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  iconTile: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sunken: { backgroundColor: colors.paperDeep, borderRadius: radius.md, padding: space.lg, gap: 10 },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.marigold, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.marigold },
  line: { flex: 1, width: 2, backgroundColor: colors.sand, marginTop: 4, marginBottom: -space.xl },
});

export default PostUpdatesSection;
