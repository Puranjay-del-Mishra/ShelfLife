import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Tone = "default" | "danger";

export type ConfirmOptions = {
  title?: string;
  message?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: Tone;
  // Optional: custom content instead of message
  content?: React.ReactNode;
};

type DialogContextValue = {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
  alert: (opts?: Omit<ConfirmOptions, "cancelText" | "tone">) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

type PendingConfirm =
  | {
      kind: "confirm";
      opts: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "alert";
      opts: Omit<ConfirmOptions, "cancelText" | "tone">;
      resolve: () => void;
    };

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const previousActive = useRef<HTMLElement | null>(null);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setPending(null), []);

  const confirm = useCallback((opts: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      previousActive.current = (document.activeElement as HTMLElement) ?? null;
      setPending({ kind: "confirm", opts, resolve });
    });
  }, []);

  const alertFn = useCallback((opts: Omit<ConfirmOptions, "cancelText" | "tone"> = {}) => {
    return new Promise<void>((resolve) => {
      previousActive.current = (document.activeElement as HTMLElement) ?? null;
      setPending({ kind: "alert", opts, resolve });
    });
  }, []);

  // Restore focus on close
  const onAfterClose = () => {
    previousActive.current?.focus?.();
  };

  const ctx = useMemo<DialogContextValue>(() => ({ confirm, alert: alertFn }), [confirm, alertFn]);

  // Focus the primary button when dialog opens
  React.useEffect(() => {
    if (pending) {
      const id = requestAnimationFrame(() => primaryBtnRef.current?.focus?.());
      return () => cancelAnimationFrame(id);
    }
  }, [pending]);

  return (
    <DialogContext.Provider value={ctx}>
      {children}
      {pending &&
        createPortal(
          <Backdrop
            onClose={() => {
              if (pending.kind === "confirm") pending.resolve(false);
              else pending.resolve();
              close();
              onAfterClose();
            }}
          >
            {pending.kind === "confirm" ? (
              <ConfirmDialogUI
                ref={primaryBtnRef}
                {...pending.opts}
                onConfirm={() => {
                  pending.resolve(true);
                  close();
                  onAfterClose();
                }}
                onCancel={() => {
                  pending.resolve(false);
                  close();
                  onAfterClose();
                }}
              />
            ) : (
              <AlertDialogUI
                ref={primaryBtnRef}
                {...pending.opts}
                onOk={() => {
                  pending.resolve();
                  close();
                  onAfterClose();
                }}
              />
            )}
          </Backdrop>,
          document.body
        )}
    </DialogContext.Provider>
  );
};

/* =============================
   Public Hooks
============================= */
export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useConfirm must be used within <DialogProvider>");
  return ctx.confirm;
}

/* =============================
   Primitive UI
============================= */

const Backdrop: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // prevent background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        {children}
      </div>
    </div>
  );
};

type ConfirmUIProps = ConfirmOptions & {
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialogUI = React.forwardRef<HTMLButtonElement, ConfirmUIProps>(
  ({ title = "Are you sure?", message, content, confirmText = "Confirm", cancelText = "Cancel", tone = "default", onConfirm, onCancel }, ref) => {
    const confirmCls =
      tone === "danger"
        ? "bg-red-600 hover:bg-red-700 text-white"
        : "bg-neutral-900 hover:bg-neutral-950 text-white";

    return (
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-neutral-600">
          {content ?? message ?? "This action cannot be undone."}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border px-3 py-1.5 text-sm"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            ref={ref}
            className={`rounded-lg px-3 py-1.5 text-sm ${confirmCls}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    );
  }
);

type AlertUIProps = Omit<ConfirmOptions, "cancelText" | "tone"> & { onOk: () => void };
const AlertDialogUI = React.forwardRef<HTMLButtonElement, AlertUIProps>(
  ({ title = "Notice", message, content, confirmText = "OK", onOk }, ref) => {
    return (
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="mt-2 text-sm text-neutral-600">
          {content ?? message}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            ref={ref}
            className="rounded-lg bg-neutral-900 hover:bg-neutral-950 text-white px-3 py-1.5 text-sm"
            onClick={onOk}
          >
            {confirmText}
          </button>
        </div>
      </div>
    );
  }
);
