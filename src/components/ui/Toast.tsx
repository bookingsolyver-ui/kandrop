"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  /** An optional link shown on the toast (e.g. "View"). */
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<((toast: Omit<ToastItem, "id">) => void) | null>(null);

/** Success/info notices at the bottom of the screen; announced to screen readers, gone after 5 s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(0);
  const timers = useRef<number[]>([]);

  const show = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = ++next.current;
    setToasts((list) => [...list.slice(-2), { ...toast, id }]);
    timers.current.push(window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000));
  }, []);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--ink-200)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink-900)] shadow-[var(--sh-md)]"
          >
            <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--kai-success-bg)] text-[var(--kai-success)]">
              ✓
            </span>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="ml-1 shrink-0 rounded-full bg-brand-orange px-3 py-1 text-[12px] font-bold text-brand-black"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>");
  return show;
}
