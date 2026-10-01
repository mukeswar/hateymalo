import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Megaphone, Plus, Clock, Send } from 'lucide-react';

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
    <div className="bg-amber-50/70 p-6 sm:p-8 rounded-3xl space-y-6 border border-amber-200 shadow-md">
      
      <div className="flex items-center justify-between border-b border-amber-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Campaign Updates & Announcements</h3>
            <p className="text-xs text-amber-800">Direct notices from the campaign organizer</p>
          </div>
        </div>

        {isCreator && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Post Update'}
          </button>
        )}
      </div>

      {/* Organizer Create Update Form */}
      {isCreator && showForm && (
        <form onSubmit={handleSubmitUpdate} className="p-4 rounded-2xl bg-white border border-amber-300 space-y-3 animate-in fade-in duration-200">
          <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
            Broadcast Announcement to Interested & Joined Volunteers
          </label>
          <textarea
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. The meeting point has moved to Patan Gate, start time is 7:30 AM sharp."
            className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl p-3 text-sm text-slate-900 outline-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl font-bold bg-amber-600 text-white shadow-md text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Broadcast Update
            </button>
          </div>
        </form>
      )}

      {/* Updates Timeline */}
      {loading ? (
        <div className="h-16 bg-slate-200 animate-pulse rounded-2xl" />
      ) : updates.length > 0 ? (
        <div className="space-y-4">
          {updates.map((up) => (
            <div
              key={up._id}
              className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 relative shadow-xs"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={up.author?.profilePicture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                    alt={up.author?.name}
                    className="w-6 h-6 rounded-lg object-cover"
                  />
                  <span className="font-bold text-slate-900">{up.author?.name}</span>
                </div>
                <span className="flex items-center gap-1 text-[11px] text-amber-800">
                  <Clock className="w-3 h-3" />
                  {new Date(up.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(up.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-900 leading-relaxed font-medium pt-1">
                {up.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic text-center py-4">
          No campaign updates published yet.
        </p>
      )}

    </div>
  );
};

export default PostUpdatesSection;
