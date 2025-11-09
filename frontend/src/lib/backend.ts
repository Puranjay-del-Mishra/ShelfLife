// src/lib/backend.ts
import { supabase } from "@/lib/supabase";

const isBrowser = typeof window !== "undefined";

const RAW_BASE =
  // Explicit override (use ONLY for local dev or special cases)
  import.meta.env.VITE_BACKEND_URL
    // Fallback: same-origin (works on EC2 behind Nginx)
    || (isBrowser ? window.location.origin : "http://localhost:8080");

const BASE = RAW_BASE.replace(/\/+$/, "");

async function authFetch(path: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}/v1${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Backend ${res.status}: ${text || res.statusText}`);
  }

  return res;
}

export const backend = {
  async getSettings() {
    const res = await authFetch("/settings", { method: "GET" });
    return res.json() as Promise<{
      user_id: string;
      notify_local_time: string;
      timezone: string;
      notify_days_before: number[];
      push_enabled: boolean;
    }>;
  },

  async updateSettings(input: {
    notify_local_time: string;
    timezone: string;
    notify_days_before: number[];
    push_enabled: boolean;
  }) {
    const res = await authFetch("/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return res.json();
  },

  async subscribeWebPush(sub: PushSubscription, platform?: string) {
    const json = sub.toJSON() as any;
    const body = {
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
      platform,
    };

    await authFetch("/webpush/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
