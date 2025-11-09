// src/lib/backend.ts
import { supabase } from "@/lib/supabase";

const RAW_BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

// Normalize so we don't end up with double slashes
const BASE =
  RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

async function authFetch(path: string, init: RequestInit = {}) {
  // ensure we have a Supabase session
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
    throw new Error(
      `Backend ${res.status}: ${text || res.statusText}`
    );
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
