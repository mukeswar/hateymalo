import React, { useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please log in to submit safety reports', 'info');
      return;
    }

    if (!reason.trim()) {
      showToast('Please specify a report reason', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/reports', {
        targetType,
        targetId,
        reason: reason.trim(),
      });

      if (res.data.success) {
        showToast(res.data.message, 'success');
        setReason('');
        onClose();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Report submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 space-y-5 border border-rose-500/40 relative shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-lg">Report {targetType}</h3>
            <p className="text-xs text-rose-300">Flag safety & guideline violations to moderators</p>
          </div>
        </div>

        {targetTitle && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 line-clamp-1">
            Target: "{targetTitle}"
          </div>
        )}

        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Reason for Report *
            </label>
            <textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this content violates community guidelines (spam, harassment, misinformation, fraud)..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-2xl p-3 text-xs text-white outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ReportModal;
