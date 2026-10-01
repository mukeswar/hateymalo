import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import {
  MessageSquare,
  Send,
  Reply,
  Edit2,
  Trash2,
  AlertTriangle,
  CornerDownRight,
  Shield,
} from 'lucide-react';

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
    <div className="bg-white p-6 sm:p-8 rounded-3xl space-y-6 border border-slate-200 shadow-md">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-700" /> Community Discussion ({comments.length})
        </h3>
      </div>

      {/* Main Comment Input */}
      {commentsDisabled ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-900 font-medium">
          Commenting is currently disabled by the administrators.
        </div>
      ) : user ? (
        <form onSubmit={(e) => handlePostComment(e, null)} className="space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={user.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
              alt={user.name}
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200"
            />
            <div className="flex-grow space-y-2">
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts, ask questions, or offer guidance..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 rounded-2xl p-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Post Comment
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
          Please log in to join the discussion.
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : topLevelComments.length > 0 ? (
        <div className="space-y-6 pt-2">
          {topLevelComments.map((comment) => {
            const replies = getReplies(comment._id);
            const isOwner = user && comment.author?._id === user._id;

            return (
              <div key={comment._id} className="space-y-4">
                
                {/* Top-level Comment Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={comment.author?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                        alt={comment.author?.name}
                        className="w-8 h-8 rounded-xl object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{comment.author?.name}</span>
                          {['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(comment.author?.role) && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 text-xs">
                      {user && (
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="text-slate-600 hover:text-teal-700 flex items-center gap-1 font-medium transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" /> Reply
                        </button>
                      )}

                      {isOwner && (
                        <button
                          onClick={() => {
                            setEditingId(comment._id);
                            setEditContent(comment.content);
                          }}
                          className="text-slate-500 hover:text-sky-700 p-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(isOwner || isAdmin) && (
                        <button
                          onClick={() => handleDelete(comment._id)}
                          className="text-slate-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {user && !isOwner && (
                        <button
                          onClick={() => handleReport(comment._id)}
                          className="text-slate-400 hover:text-amber-700 p-1"
                          title="Report Comment"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content / Edit Form */}
                  {editingId === comment._id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditSubmit(comment._id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-800 leading-relaxed pl-11">
                      {comment.content}
                    </p>
                  )}

                </div>

                {/* Reply Form */}
                {replyingTo === comment._id && (
                  <div className="pl-10 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <CornerDownRight className="w-4 h-4 text-teal-700 shrink-0 mt-2" />
                      <textarea
                        rows={2}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.author?.name}...`}
                        className="w-full bg-white border border-slate-200 focus:border-teal-600 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => handlePostComment(e, comment._id)}
                        className="px-4 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white"
                      >
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested Replies Tree */}
                {replies.length > 0 && (
                  <div className="pl-8 sm:pl-12 space-y-3 border-l-2 border-slate-200 ml-4">
                    {replies.map((reply) => {
                      const isReplyOwner = user && reply.author?._id === user._id;

                      return (
                        <div key={reply._id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={reply.author?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                                alt={reply.author?.name}
                                className="w-6 h-6 rounded-lg object-cover"
                              />
                              <span className="font-bold text-slate-900 text-xs">{reply.author?.name}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              {(isReplyOwner || isAdmin) && (
                                <button
                                  onClick={() => handleDelete(reply._id)}
                                  className="text-slate-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-800 leading-relaxed pl-8">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-slate-500">
          No comments yet. Start the conversation!
        </div>
      )}

    </div>
  );
};

export default CommentSection;
