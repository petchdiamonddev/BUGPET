import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';

/**
 * Accessible modal: focus trap-ish behaviour (autofocus first field), Esc to
 * close, click on backdrop to close, body scroll lock, and a consistent
 * paper "sheet" panel with an offset shadow.
 */
export function Modal({ open, onClose, title, eyebrow, description, children, footer, size = 'md', closeOnBackdrop = true }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    // Lock scrolling without losing the current offset: `overflow: hidden` on
    // <body> is enough, and it is always restored when the modal unmounts or
    // the route changes, so the page can never stay frozen.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'input:not([type="hidden"]), textarea, select, button[data-autofocus], [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus?.({ preventScroll: true });
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/35 backdrop-blur-[2px]"
        onClick={() => closeOnBackdrop && onClose?.()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-panel border border-paper-line bg-paper-raised shadow-lift sm:rounded-panel',
          sizes[size]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-paper-line px-5 py-4">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-paper-soft hover:text-ink"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-paper-line bg-paper-soft/60 px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Promise-based confirm dialog replacement for window.confirm().
 * Usage: `const ok = await confirm({ title, description, confirmLabel, tone })`.
 */
export function useConfirm() {
  const [state, setState] = React.useState(null);
  const resolverRef = useRef(null);

  const confirm = (options) =>
    new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        tone: 'default',
        confirmLabel: 'ยืนยัน',
        cancelLabel: 'ยกเลิก',
        ...options,
      });
    });

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  };

  const dialog = (
    <Modal
      open={Boolean(state)}
      onClose={() => close(false)}
      title={state?.title}
      description={state?.description}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost btn-sm" onClick={() => close(false)}>
            {state?.cancelLabel}
          </button>
          <button
            className={cn(state?.tone === 'danger' ? 'btn-danger' : 'btn-primary', 'btn-sm')}
            onClick={() => close(true)}
          >
            {state?.confirmLabel}
          </button>
        </div>
      }
    >
      {state?.body}
    </Modal>
  );

  return [confirm, dialog];
}
