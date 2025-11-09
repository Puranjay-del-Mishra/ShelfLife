// src/services/realtime.ts
import { supabase } from "@/lib/supabase";

const HTTP_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

function makeWsUrl(path: string) {
  const u = new URL(path, HTTP_BASE);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}

type Listener = (msg: any) => void;

let ws: WebSocket | null = null;
let listeners = new Set<Listener>();
let connecting = false;

async function ensureConnection() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (connecting) return;
  connecting = true;

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      connecting = false;
      return;
    }

    const url = makeWsUrl(`/v1/ws?token=${encodeURIComponent(token)}`);
    ws = new WebSocket(url);

    ws.onopen = () => {
      connecting = false;
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      for (const fn of listeners) {
        try {
          fn(msg);
        } catch {
          // ignore listener errors
        }
      }
    };

    ws.onclose = () => {
      ws = null;
      // lightweight reconnect: only if there are listeners
      if (listeners.size > 0) {
        setTimeout(() => {
          if (listeners.size > 0) ensureConnection();
        }, 2000);
      }
    };

    ws.onerror = () => {
      // error handled via onclose
    };
  } finally {
    connecting = false;
  }
}

/**
 * Subscribe to realtime messages.
 * Returns an unsubscribe function.
 */
export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  void ensureConnection();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && ws) {
      ws.close();
      ws = null;
    }
  };
}
