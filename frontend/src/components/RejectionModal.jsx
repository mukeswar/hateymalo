import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const RejectionModal = ({ isOpen, onClose, onConfirm, postTitle }) => {
  const [reason, setReason] = useState('');
  const textareaRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Close on Escape and focus the reason field when opened
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason);
    setReason('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejection-modal-title"
        aria-describedby="rejection-modal-desc"
        className="card !rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-[var(--shadow-lift)] animate-pop max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-sand">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-tint text-brand flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="rejection-modal-title" className="text-xl font-bold text-ink leading-tight">
                Reject post
              </h3>
              <p id="rejection-modal-desc" className="text-sm text-muted">
                Your feedback is sent to the author so they can improve it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <p className="field-label">Post title</p>
            <p className="text-sm font-medium text-ink surface-sunken !rounded-xl p-3 break-words">
              &ldquo;{postTitle}&rdquo;
            </p>
          </div>

          <div>
            <label htmlFor="rejection-reason" className="field-label">
              Rejection reason <span className="text-brand">*</span>
            </label>
            <textarea
              id="rejection-reason"
              ref={textareaRef}
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Please provide more details regarding safety measures, or this content contains commercial advertisement."
              className="field"
            />
            <p className="text-xs text-muted mt-1">Be specific and kind — the author will read this.</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-4 border-t border-sand">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;
