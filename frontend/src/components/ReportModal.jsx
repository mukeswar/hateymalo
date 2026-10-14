import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Flag, X } from 'lucide-react';

const TARGET_LABELS = { USER: 'member', POST: 'request', COMMENT: 'comment', BLOG: 'story' };

const ReportModal = ({ isOpen, onClose, targetType, targetId, targetTitle }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on Escape and focus the reason field when opened
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const label = TARGET_LABELS[targetType] || (targetType ? String(targetType).toLowerCase() : 'content');

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="card !rounded-3xl w-full max-w-md p-6 sm:p-7 space-y-5 relative animate-pop"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3 pr-10">
          <span className="w-11 h-11 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h3 id="report-modal-title" className="text-xl font-semibold text-ink">Report this {label}</h3>
            <p className="text-sm text-muted">Our moderators review every report privately.</p>
          </div>
        </div>

        {targetTitle && (
          <div className="surface-sunken px-4 py-3 text-sm font-semibold text-ink-soft line-clamp-1">
            “{targetTitle}”
          </div>
        )}

        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label htmlFor="report-reason" className="field-label">
              What's wrong? <span className="text-brand" aria-hidden="true">*</span>
            </label>
            <textarea
              id="report-reason"
              ref={textareaRef}
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. spam, harassment, misleading information or a suspected scam…"
              className="field leading-relaxed"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
