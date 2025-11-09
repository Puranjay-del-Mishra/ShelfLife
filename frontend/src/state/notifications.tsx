// src/state/notifications.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { subscribeRealtime } from "@/services/realtime";
import { useAuth } from "@/providers/AuthProvider";

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
    case "push":
      return [action.notice, ...state].slice(0, 200);
    case "mark":
      return state.map((n) =>
        n.id === action.id ? { ...n, read: true } : n
      );
    case "markAll":
      return state.map((n) => ({ ...n, read: true }));
    case "hydrate":
      return action.notices;
    default:
      return state;
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

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, []);
  const { session } = useAuth();

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Notice[];
        if (Array.isArray(parsed)) {
          dispatch({ type: "hydrate", notices: parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Realtime: subscribe when logged in
  useEffect(() => {
    if (!session) return;

    const unsubscribe = subscribeRealtime((msg) => {
      // Backend -> WS payload format:
      // { type: "notification", notice: { kind, title, body?, itemId? } }
      if (msg?.type === "notification" && msg.notice) {
        const n = msg.notice;
        dispatch({
          type: "push",
          notice: {
            id: n.id || crypto.randomUUID(),
            kind: (n.kind as NoticeKind) || "info",
            title: n.title || "Notification",
            body: n.body,
            itemId: n.itemId,
            createdAt: n.createdAt || Date.now(),
            read: false,
          },
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [session]);

  const api = useMemo(
    () => ({
      notices: state,
      unread: state.filter((n) => !n.read).length,
      push: (n: Omit<Notice, "id" | "createdAt" | "read">) =>
        dispatch({
          type: "push",
          notice: {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            read: false,
            ...n,
          },
        }),
      mark: (id: string) => dispatch({ type: "mark", id }),
      markAll: () => dispatch({ type: "markAll" }),
    }),
    [state]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used inside NotificationsProvider"
    );
  }
  return ctx;
}
