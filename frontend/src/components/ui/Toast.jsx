import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';

const ToastContext = createContext(() => {});

const TONE = {
  success: { bar: 'bg-moss', icon: 'text-moss' },
  error: { bar: 'bg-ember', icon: 'text-ember-deep' },
  info: { bar: 'bg-ink', icon: 'text-ink' },
  reward: { bar: 'bg-acid', icon: 'text-acid' },
};

function ToastItem({ toast, onDismiss }) {
  const tone = TONE[toast.tone] ?? TONE.info;
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration ?? 4200);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      role="status"
      className="pointer-events-auto relative flex w-[min(92vw,380px)] animate-pop-in items-start gap-3 overflow-hidden rounded-xl border border-paper-line bg-paper-raised p-3 pr-9 shadow-lift"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} />
      {toast.icon && <span className={cn('mt-0.5', tone.icon)}>{toast.icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{toast.description}</p>}
        {toast.action}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-2 top-2 rounded-md p-1 text-ink-faint transition-colors hover:bg-paper-soft hover:text-ink"
        aria-label="ปิดการแจ้งเตือน"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (toast) => {
      const id = ++idRef.current;
      const entry = typeof toast === 'string' ? { title: toast } : toast;
      setToasts((list) => [...list.slice(-3), { id, tone: 'info', ...entry }]);
      return id;
    },
    []
  );

  const api = React.useMemo(() => {
    const base = (opts) => push(opts);
    base.success = (title, description, opts) => push({ ...opts, tone: 'success', title, description });
    base.error = (title, description, opts) => push({ ...opts, tone: 'error', title, description });
    base.info = (title, description, opts) => push({ ...opts, tone: 'info', title, description });
    base.reward = (title, description, opts) => push({ ...opts, tone: 'reward', title, description, duration: 6000 });
    base.dismiss = dismiss;
    return base;
  }, [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 bottom-[124px] sm:inset-x-auto sm:right-6 sm:items-end">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
