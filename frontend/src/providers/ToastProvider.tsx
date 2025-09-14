import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Tone = "default" | "success" | "error" | "info";
type Toast = {
  id: string;
  title?: string;
  description?: string | React.ReactNode;
  tone: Tone;
  duration: number; // ms
};

type ToastAPI = {
  toast: (opts: Partial<Omit<Toast, "id" | "tone" | "duration">> & { title?: string; description?: string | React.ReactNode; tone?: Tone; duration?: number }) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastAPI | null>(null);
const genId = () => Math.random().toString(36).slice(2);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const spawn = useCallback(
    (opts: Partial<Toast>) => {
      const id = genId();
      const t: Toast = {
        id,
        tone: opts.tone ?? "default",
        title: opts.title,
        description: opts.description,
        duration: opts.duration ?? 3000,
      };
      setToasts((prev) => [...prev, t]);
      if (t.duration > 0) {
        setTimeout(() => dismiss(id), t.duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo<ToastAPI>(() => ({
    toast: (o) => spawn(o),
    success: (title, description) => spawn({ tone: "success", title, description }),
    error: (title, description) => spawn({ tone: "error", title, description, duration: 5000 }),
    info: (title, description) => spawn({ tone: "info", title, description }),
    dismiss,
    dismissAll,
  }), [spawn, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed top-3 right-3 z-[1000] flex flex-col gap-2"
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} t={t} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/* ---------- UI ---------- */

function toneClasses(tone: Tone) {
  switch (tone) {
    case "success": return "bg-green-600 text-white";
    case "error":   return "bg-red-600 text-white";
    case "info":    return "bg-blue-600 text-white";
    default:        return "bg-neutral-900 text-white";
  }
}

const ToastItem: React.FC<{ t: Toast; onClose: () => void }> = ({ t, onClose }) => {
  return (
    <div
      role="status"
      className={`pointer-events-auto min-w-[260px] max-w-[360px] rounded-2xl shadow-lg px-4 py-3 ${toneClasses(t.tone)}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {t.title && <div className="font-medium">{t.title}</div>}
          {t.description && <div className="text-sm opacity-90">{t.description}</div>}
        </div>
        <button
          aria-label="Close"
          className="opacity-70 hover:opacity-100 transition"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </div>
  );
};
