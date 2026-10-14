import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CornerDownRight, Flag, Lock, MessageSquare, Pencil, Reply, Send, ShieldCheck, Trash2 } from 'lucide-react-native';
import API, { errorMessage } from '../lib/api';
import { confirm } from '../lib/confirm';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { Avatar, Button, Card, Chip, Field, Row, Sheet, Skeleton, T } from './ui';
import { colors, fonts, radius, space } from '../theme';

// Port of frontend/src/components/CommentSection.jsx. Same `{ postId }` prop —
// blog and event details pass their own id (the API threads comments by target id).
const formatStamp = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

const IconBtn = ({ icon: Icon, onPress, label, color = colors.muted }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={styles.iconBtn}>
    <Icon size={16} color={color} />
  </Pressable>
);

const CommentSection = ({ postId }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const commentsDisabled = settings && settings.allowPublicComments === false && !isAdmin;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await API.get(`/interactions/posts/${postId}/comments`);
      if (res.data.success) setComments(res.data.data);
    } catch {
      /* keep the list as it was */
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) fetchComments();
  }, [postId, fetchComments]);

  const handlePostComment = async (parentId = null) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;
    setBusy(true);
    try {
      const res = await API.post(`/interactions/posts/${postId}/comments`, {
        content: content.trim(),
        parentComment: parentId,
      });
      if (res.data.success) {
        showToast(parentId ? 'Reply posted!' : 'Comment posted!', 'success');
        if (parentId) {
          setReplyingTo(null);
          setReplyContent('');
        } else {
          setNewComment('');
        }
        fetchComments();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Comment failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleEditSubmit = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      const res = await API.put(`/interactions/comments/${commentId}`, { content: editContent.trim() });
      if (res.data.success) {
        showToast('Comment updated', 'success');
        setEditingId(null);
        fetchComments();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Update failed'), 'error');
    }
  };

  const handleDelete = async (commentId) => {
    if (!(await confirm('Delete this comment?', '', { confirmText: 'Delete' }))) return;
    try {
      const res = await API.delete(`/interactions/comments/${commentId}`);
      if (res.data.success) {
        showToast('Comment deleted', 'success');
        fetchComments();
      }
    } catch (error) {
      showToast(errorMessage(error, 'Delete failed'), 'error');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      showToast('Please specify a report reason', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await API.post(`/interactions/comments/${reportingId}/report`, { reason: reportReason.trim() });
      if (res.data.success) {
        showToast(res.data.message, 'info');
        setReportingId(null);
        setReportReason('');
      }
    } catch (error) {
      showToast(errorMessage(error, 'Report failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const topLevelComments = comments.filter((c) => !c.parentComment);
  const getReplies = (parentId) => comments.filter((c) => c.parentComment === parentId);

  return (
    <Card style={{ gap: space.lg }}>
      <Row>
        <MessageSquare size={20} color={colors.brand} />
        <T variant="h2">Discussion</T>
        <Chip label={String(comments.length)} tone={{ bg: colors.paperDeep, fg: colors.inkSoft }} style={{ paddingVertical: 2, paddingHorizontal: 10 }} />
      </Row>

      {commentsDisabled ? (
        <View style={[styles.notice, { backgroundColor: colors.marigoldTint }]}>
          <Lock size={16} color={colors.marigoldText} />
          <T variant="small" style={{ flex: 1, color: colors.inkSoft }}>Commenting is currently turned off by the administrators.</T>
        </View>
      ) : user ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={user.name} src={user.profilePicture} size="md" />
          <View style={{ flex: 1, gap: 8 }}>
            <Field
              multiline
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Ask a question, offer advice or say you're coming…"
              accessibilityLabel="Write a comment"
            />
            <Button
              title="Post comment"
              icon={Send}
              size="sm"
              style={{ alignSelf: 'flex-end' }}
              disabled={!newComment.trim()}
              loading={busy && !replyingTo}
              onPress={() => handlePostComment(null)}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.notice, { backgroundColor: colors.paperDeep, justifyContent: 'space-between' }]}>
          <T variant="small" style={{ color: colors.inkSoft, flex: 1 }}>Log in to join the discussion.</T>
          <Button title="Log in" variant="ghost" size="sm" onPress={() => router.push('/login')} />
        </View>
      )}

      {loading ? (
        <View style={{ gap: 10 }}>
          <Skeleton height={72} radius={16} />
          <Skeleton height={72} radius={16} />
        </View>
      ) : topLevelComments.length > 0 ? (
        <View style={{ gap: space.xl }}>
          {topLevelComments.map((comment) => {
            const replies = getReplies(comment._id);
            const isOwner = user && comment.author?._id === user._id;
            const isStaff = STAFF.includes(comment.author?.role);
            return (
              <View key={comment._id} style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Avatar name={comment.author?.name || 'Member'} src={comment.author?.profilePicture} size="md" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.bubble}>
                      <Row wrap gap={6}>
                        <T variant="semibold">{comment.author?.name}</T>
                        {isStaff ? (
                          <Chip label="Admin" icon={ShieldCheck} tone={{ bg: colors.pineTint, fg: colors.pine }} style={{ paddingVertical: 1, paddingHorizontal: 8 }} />
                        ) : null}
                        <T variant="caption">{formatStamp(comment.createdAt)}</T>
                      </Row>
                      {editingId === comment._id ? (
                        <View style={{ gap: 8, marginTop: 8 }}>
                          <Field multiline value={editContent} onChangeText={setEditContent} accessibilityLabel="Edit comment" />
                          <Row style={{ justifyContent: 'flex-end' }}>
                            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setEditingId(null)} />
                            <Button title="Save" size="sm" onPress={() => handleEditSubmit(comment._id)} />
                          </Row>
                        </View>
                      ) : (
                        <T style={{ marginTop: 4 }}>{comment.content}</T>
                      )}
                    </View>

                    <Row gap={2} style={{ marginTop: 4 }}>
                      {user ? (
                        <Pressable
                          onPress={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: replyingTo === comment._id }}
                          style={styles.replyBtn}
                        >
                          <Reply size={16} color={colors.muted} />
                          <T style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.muted }}>Reply</T>
                        </Pressable>
                      ) : null}
                      {isOwner ? (
                        <IconBtn
                          icon={Pencil}
                          label="Edit comment"
                          onPress={() => {
                            setEditingId(comment._id);
                            setEditContent(comment.content);
                          }}
                        />
                      ) : null}
                      {isOwner || isAdmin ? <IconBtn icon={Trash2} label="Delete comment" onPress={() => handleDelete(comment._id)} /> : null}
                      {user && !isOwner ? (
                        <IconBtn
                          icon={Flag}
                          label="Report comment"
                          onPress={() => {
                            setReportReason('');
                            setReportingId(comment._id);
                          }}
                        />
                      ) : null}
                    </Row>
                  </View>
                </View>

                {replyingTo === comment._id ? (
                  <View style={{ paddingLeft: 24, gap: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <CornerDownRight size={16} color={colors.muted} style={{ marginTop: 14 }} />
                      <Field
                        style={{ flex: 1 }}
                        multiline
                        value={replyContent}
                        onChangeText={setReplyContent}
                        placeholder={`Reply to ${comment.author?.name}…`}
                        accessibilityLabel={`Reply to ${comment.author?.name}`}
                      />
                    </View>
                    <Row style={{ justifyContent: 'flex-end' }}>
                      <Button title="Cancel" variant="ghost" size="sm" onPress={() => setReplyingTo(null)} />
                      <Button title="Send reply" icon={Send} size="sm" loading={busy} onPress={() => handlePostComment(comment._id)} />
                    </Row>
                  </View>
                ) : null}

                {replies.length > 0 ? (
                  <View style={styles.replies}>
                    {replies.map((reply) => {
                      const isReplyOwner = user && reply.author?._id === user._id;
                      return (
                        <View key={reply._id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                          <Avatar name={reply.author?.name || 'Member'} src={reply.author?.profilePicture} size="sm" />
                          <View style={[styles.bubble, { flex: 1, paddingVertical: 8, paddingHorizontal: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                              <Row wrap gap={6} style={{ flex: 1 }}>
                                <T variant="semibold" style={{ fontSize: 14.5 }}>{reply.author?.name}</T>
                                <T variant="caption">{formatStamp(reply.createdAt)}</T>
                              </Row>
                              {isReplyOwner || isAdmin ? (
                                <IconBtn icon={Trash2} label="Delete reply" onPress={() => handleDelete(reply._id)} />
                              ) : null}
                            </View>
                            <T style={{ fontSize: 15 }}>{reply.content}</T>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: 8 }}>
          <MessageSquare size={30} color={colors.sand} />
          <T variant="small" style={{ textAlign: 'center' }}>No comments yet. Questions and encouragement are always welcome.</T>
        </View>
      )}

      <Sheet
        visible={!!reportingId}
        onClose={() => setReportingId(null)}
        title="Report comment"
        footer={<Button title="Submit report" onPress={handleReport} loading={busy} full />}
      >
        <Field
          label="Please specify the reason for reporting this comment"
          multiline
          value={reportReason}
          onChangeText={setReportReason}
          placeholder="e.g. spam, harassment or misleading information"
          autoFocus
        />
      </Sheet>
    </Card>
  );
};

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: radius.md },
  bubble: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.sand,
    borderRadius: 16,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: radius.pill },
  replies: { marginLeft: 18, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: colors.sand, gap: 10 },
});

export default CommentSection;
