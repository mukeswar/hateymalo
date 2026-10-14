import React, { createContext, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

const STYLES = {
  success: { accent: 'bg-pine', icon: CheckCircle2, iconClass: 'text-pine bg-pine-tint' },
  error: { accent: 'bg-brand', icon: AlertCircle, iconClass: 'text-brand bg-brand-tint' },
  warning: { accent: 'bg-marigold', icon: AlertTriangle, iconClass: 'text-marigold-text bg-marigold-tint' },
  info: { accent: 'bg-sky-ink', icon: Info, iconClass: 'text-sky-ink bg-sky-tint' },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (message, type = 'info') => {
    // Counter suffix keeps ids unique when two toasts fire in the same millisecond.
    const id = `${Date.now()}-${seq.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[70] flex flex-col gap-3 sm:w-full sm:max-w-sm pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const s = STYLES[toast.type] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto relative overflow-hidden flex items-start gap-3 pl-5 pr-3 py-3.5 bg-white border border-sand rounded-2xl shadow-[var(--shadow-lift)] animate-in animate-rise"
            >
              <span className={`absolute left-0 inset-y-0 w-1.5 ${s.accent}`} aria-hidden="true" />
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.iconClass}`}>
                <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-ink leading-relaxed flex-grow pt-1">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-deep transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
