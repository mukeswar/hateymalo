import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from './ui/Avatar';
import { Megaphone, Plus, X, Send } from 'lucide-react';

const formatStamp = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const PostUpdatesSection = ({ postId, isCreator }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUpdates = async () => {
    try {
      const res = await API.get(`/interactions/posts/${postId}/updates`);
      if (res.data.success) {
        setUpdates(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch post updates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [postId]);

  const handleSubmitUpdate = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const res = await API.post(`/interactions/posts/${postId}/updates`, {
        content: content.trim(),
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setContent('');
        setShowForm(false);
        fetchUpdates();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to post update', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card p-6 sm:p-8 space-y-6" aria-labelledby="updates-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="updates-title" className="text-2xl font-semibold text-ink">Updates from the organiser</h2>
            <p className="text-sm text-muted">News, changes of plan and progress on this request.</p>
          </div>
        </div>

        {isCreator && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            aria-expanded={showForm}
            className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`}
          >
            {showForm ? <X className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
            {showForm ? 'Cancel' : 'Post update'}
          </button>
        )}
      </div>

      {/* Organiser: create update */}
      {isCreator && showForm && (
        <form onSubmit={handleSubmitUpdate} className="surface-sunken p-4 sm:p-5 space-y-3 animate-rise">
          <label htmlFor={`update-${postId}`} className="field-label">
            Share an update with everyone who joined or is interested
          </label>
          <textarea
            id={`update-${postId}`}
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. The meeting point has moved to Patan Gate; we start at 7:30 AM."
            className="field leading-relaxed"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              <Send className="w-4 h-4" aria-hidden="true" /> {submitting ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </form>
      )}

      {/* Updates timeline */}
      {loading ? (
        <div className="h-16 bg-paper-deep animate-pulse rounded-2xl" aria-hidden="true" />
      ) : updates.length > 0 ? (
        <ol className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-sand">
          {updates.map((up) => (
            <li key={up._id} className="relative pl-10">
              <span
                className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-marigold flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="w-2 h-2 rounded-full bg-marigold" />
              </span>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Avatar name={up.author?.name || 'Organiser'} src={up.author?.profilePicture} size="xs" />
                <span className="font-semibold text-ink">{up.author?.name}</span>
                <time dateTime={up.createdAt} className="text-muted">{formatStamp(up.createdAt)}</time>
              </div>
              <p className="mt-2 text-ink-soft leading-relaxed whitespace-pre-line break-words">{up.content}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted">
          {isCreator ? 'No updates yet. Post one to keep your helpers in the loop.' : 'No updates yet — the organiser will post news here.'}
        </p>
      )}
    </section>
  );
};

export default PostUpdatesSection;
