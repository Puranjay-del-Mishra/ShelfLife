import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

export type NoticeKind = "info" | "warning";
export type Notice = {
  id: string;
  kind: NoticeKind;
  title: string;
  body?: string;
  itemId?: string | number;
  createdAt: number;
  read: boolean;
};

type Action =
  | { type: "push"; notice: Notice }
  | { type: "mark"; id: string }
  | { type: "markAll" }
  | { type: "hydrate"; notices: Notice[] };

function reducer(state: Notice[], action: Action): Notice[] {
  switch (action.type) {
    case "push":     return [action.notice, ...state].slice(0, 200);
    case "mark":     return state.map(n => n.id === action.id ? { ...n, read: true } : n);
    case "markAll":  return state.map(n => ({ ...n, read: true }));
    case "hydrate":  return action.notices;
    default:         return state;
  }
}

const Ctx = createContext<{
  notices: Notice[];
  unread: number;
  push: (n: Omit<Notice, "id" | "createdAt" | "read">) => void;
  mark: (id: string) => void;
  markAll: () => void;
} | null>(null);

const LS_KEY = "shelflife:notices:v1";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) dispatch({ type:"hydrate", notices: JSON.parse(raw) }); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  const api = useMemo(() => ({
    notices: state,
    unread: state.filter(n => !n.read).length,
    push: (n: Omit<Notice, "id" | "createdAt" | "read">) =>
      dispatch({ type:"push", notice: { id: crypto.randomUUID(), createdAt: Date.now(), read:false, ...n } }),
    mark: (id: string) => dispatch({ type:"mark", id }),
    markAll: () => dispatch({ type:"markAll" }),
  }), [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
