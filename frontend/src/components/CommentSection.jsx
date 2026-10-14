import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import Avatar from './ui/Avatar';
import {
  MessageSquare,
  Send,
  Reply,
  Pencil,
  Trash2,
  Flag,
  CornerDownRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';

const formatStamp = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const iconBtn =
  'w-9 h-9 rounded-full inline-flex items-center justify-center text-muted transition-colors hover:bg-paper-deep';

const CommentSection = ({ postId }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const commentsDisabled = settings && settings.allowPublicComments === false && !isAdmin;

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // commentId
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const fetchComments = async () => {
    try {
      const res = await API.get(`/interactions/posts/${postId}/comments`);
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handlePostComment = async (e, parentId = null) => {
    e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

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
      showToast(error.response?.data?.message || 'Comment failed', 'error');
    }
  };

  const handleEditSubmit = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      const res = await API.put(`/interactions/comments/${commentId}`, {
        content: editContent.trim(),
      });
      if (res.data.success) {
        showToast('Comment updated', 'success');
        setEditingId(null);
        fetchComments();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Update failed', 'error');
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await API.delete(`/interactions/comments/${commentId}`);
      if (res.data.success) {
        showToast('Comment deleted', 'success');
        fetchComments();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleReport = async (commentId) => {
    const reason = window.prompt('Please specify the reason for reporting this comment:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await API.post(`/interactions/comments/${commentId}/report`, {
        reason: reason.trim(),
      });
      if (res.data.success) {
        showToast(res.data.message, 'info');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Report failed', 'error');
    }
  };

  // Group top-level comments and child replies
  const topLevelComments = comments.filter((c) => !c.parentComment);
  const getReplies = (parentId) => comments.filter((c) => c.parentComment === parentId);

  return (
    <section className="card p-6 sm:p-8 space-y-6" aria-labelledby="discussion-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="discussion-title" className="text-2xl font-semibold text-ink flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand" aria-hidden="true" /> Discussion
          <span className="chip bg-paper-deep text-ink-soft">{comments.length}</span>
        </h2>
      </div>

      {/* Main comment input */}
      {commentsDisabled ? (
        <div className="rounded-2xl bg-marigold-tint p-4 flex items-center gap-3 text-sm text-ink-soft">
          <Lock className="w-4 h-4 text-marigold-text shrink-0" aria-hidden="true" />
          Commenting is currently turned off by the administrators.
        </div>
      ) : user ? (
        <form onSubmit={(e) => handlePostComment(e, null)} className="flex items-start gap-3">
          <Avatar name={user.name} src={user.profilePicture} size="md" />
          <div className="flex-grow space-y-2">
            <label htmlFor={`new-comment-${postId}`} className="sr-only">Write a comment</label>
            <textarea
              id={`new-comment-${postId}`}
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ask a question, offer advice or say you're coming…"
              className="field leading-relaxed"
            />
            <div className="flex justify-end">
              <button type="submit" disabled={!newComment.trim()} className="btn btn-primary btn-sm">
                <Send className="w-4 h-4" aria-hidden="true" /> Post comment
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="surface-sunken p-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
          <span>Log in to join the discussion.</span>
          <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3" aria-hidden="true">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 bg-paper-deep animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : topLevelComments.length > 0 ? (
        <ul className="space-y-6">
          {topLevelComments.map((comment) => {
            const replies = getReplies(comment._id);
            const isOwner = user && comment.author?._id === user._id;
            const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(comment.author?.role);

            return (
              <li key={comment._id} className="space-y-3">
                {/* Top-level comment */}
                <article className="flex items-start gap-3">
                  <Avatar name={comment.author?.name || 'Member'} src={comment.author?.profilePicture} size="md" />
                  <div className="flex-grow min-w-0">
                    <div className="rounded-2xl rounded-tl-md bg-paper border border-sand px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-ink">{comment.author?.name}</span>
                        {isStaff && (
                          <span className="chip !py-0 bg-pine-tint text-pine">
                            <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Admin
                          </span>
                        )}
                        <span className="text-xs text-muted">{formatStamp(comment.createdAt)}</span>
                      </div>

                      {editingId === comment._id ? (
                        <div className="mt-2 space-y-2">
                          <label htmlFor={`edit-${comment._id}`} className="sr-only">Edit comment</label>
                          <textarea
                            id={`edit-${comment._id}`}
                            rows={2}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="field"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost btn-sm">
                              Cancel
                            </button>
                            <button type="button" onClick={() => handleEditSubmit(comment._id)} className="btn btn-primary btn-sm">
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-ink-soft leading-relaxed whitespace-pre-line break-words">{comment.content}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      {user && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          aria-expanded={replyingTo === comment._id}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-full font-semibold text-muted hover:text-brand hover:bg-paper-deep transition-colors"
                        >
                          <Reply className="w-4 h-4" aria-hidden="true" /> Reply
                        </button>
                      )}

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(comment._id);
                            setEditContent(comment.content);
                          }}
                          className={`${iconBtn} hover:text-sky-ink`}
                          aria-label="Edit comment"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}

                      {(isOwner || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment._id)}
                          className={`${iconBtn} hover:text-brand`}
                          aria-label="Delete comment"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}

                      {user && !isOwner && (
                        <button
                          type="button"
                          onClick={() => handleReport(comment._id)}
                          className={`${iconBtn} hover:text-marigold-text`}
                          aria-label="Report comment"
                          title="Report comment"
                        >
                          <Flag className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </article>

                {/* Reply form */}
                {replyingTo === comment._id && (
                  <div className="pl-6 sm:pl-12 space-y-2 animate-rise">
                    <div className="flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-muted shrink-0 mt-3" aria-hidden="true" />
                      <label htmlFor={`reply-${comment._id}`} className="sr-only">Reply to {comment.author?.name}</label>
                      <textarea
                        id={`reply-${comment._id}`}
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.author?.name}…`}
                        className="field"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setReplyingTo(null)} className="btn btn-ghost btn-sm">
                        Cancel
                      </button>
                      <button type="button" onClick={(e) => handlePostComment(e, comment._id)} className="btn btn-primary btn-sm">
                        <Send className="w-3.5 h-3.5" aria-hidden="true" /> Send reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                  <ul className="ml-5 pl-5 sm:ml-5 sm:pl-7 border-l-2 border-sand space-y-3">
                    {replies.map((reply) => {
                      const isReplyOwner = user && reply.author?._id === user._id;

                      return (
                        <li key={reply._id} className="flex items-start gap-2.5">
                          <Avatar name={reply.author?.name || 'Member'} src={reply.author?.profilePicture} size="sm" />
                          <div className="flex-grow min-w-0 rounded-2xl rounded-tl-md bg-paper border border-sand px-3.5 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex flex-wrap items-baseline gap-x-2">
                                <span className="font-semibold text-ink text-sm">{reply.author?.name}</span>
                                <span className="text-xs text-muted">{formatStamp(reply.createdAt)}</span>
                              </span>
                              {(isReplyOwner || isAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(reply._id)}
                                  className="w-8 h-8 -mr-1 rounded-full inline-flex items-center justify-center text-muted hover:text-brand hover:bg-paper-deep transition-colors shrink-0"
                                  aria-label="Delete reply"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line break-words">{reply.content}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center">
          <MessageSquare className="w-8 h-8 mx-auto text-sand" aria-hidden="true" />
          <p className="mt-2 text-muted">No comments yet. Questions and encouragement are always welcome.</p>
        </div>
      )}
    </section>
  );
};

export default CommentSection;
