// src/components/auth/SignInOverlay.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function SignInOverlay() {
  const { session } = useAuth();
  const visible = !session;

  // UI state
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [otp, setOtp]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState<string | null>(null);

  // resend cooldown → 15s
  const RESEND_MS = 15_000;
  const storageKey = useMemo(() => (email ? `sl_last_send_${email}` : ""), [email]);
  const [cooldownMs, setCooldownMs] = useState(0);

  const resetAll = useCallback(() => {
    setEmail("");
    setSent(false);
    setOtp("");
    setBusy(false);
    setMsg(null);
    setCooldownMs(0);
  }, []);

  // Reset state whenever we become visible (signed out)
  useEffect(() => {
    if (visible) resetAll();
  }, [visible, resetAll]);

  // Only run cooldown timer when visible AND we have a key
  useEffect(() => {
    if (!visible || !storageKey) {
      setCooldownMs(0);
      return;
    }
    const readLeft = () => {
      const last = Number(localStorage.getItem(storageKey) || 0);
      return Math.max(0, RESEND_MS - (Date.now() - last));
    };
    setCooldownMs(readLeft());
    const id = setInterval(() => setCooldownMs(readLeft()), 500);
    return () => clearInterval(id);
  }, [visible, storageKey]);

  if (!visible) return null;

  async function sendCode() {
    if (!email || cooldownMs > 0) return;
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
      if (storageKey) localStorage.setItem(storageKey, String(Date.now()));
      setMsg("We sent a 6-digit code to your email.");
    } catch (e: any) {
      const m = e?.message || "Failed to send code.";
      setMsg(m.includes("rate limit") ? "You’re requesting codes too fast. Please wait ~15s." : m);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!email || otp.length !== 6) return;
    setBusy(true); setMsg(null);
    try {
      let { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" as any });
      if (error) {
        const r = await supabase.auth.verifyOtp({ email, token: otp, type: "signup" as any });
        if (r.error) throw r.error;
      }
      resetAll(); // AuthProvider picks up session; overlay hides
    } catch (e: any) {
      const m = e?.message || "Invalid code.";
      setMsg(m.includes("OTP") || m.includes("expired") ? "Code is invalid or expired. Request a new one." : m);
    } finally {
      setBusy(false);
    }
  }

  const cooldownSec = Math.ceil(cooldownMs / 1000);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">Welcome to ShelfLife</h1>
        <p className="text-sm text-neutral-600 mt-1">Sign in with a one-time code.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm text-neutral-600">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              {sent && (
                <button
                  type="button"
                  className="mt-1 text-sm underline px-2"
                  onClick={() => { setSent(false); setOtp(""); setMsg(null); }}
                  disabled={busy}
                  title="Change email"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-lg bg-neutral-900 text-white px-4 py-2 disabled:opacity-50"
              onClick={sendCode}
              disabled={!email || busy || cooldownMs > 0}
            >
              {cooldownMs > 0 ? `Resend in ${cooldownSec}s` : (sent ? "Resend code" : "Send code")}
            </button>
          </div>

          {sent && (
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                className="w-32 rounded-lg border px-3 py-2 tracking-widest text-center"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                disabled={busy}
              />
              <button
                className="rounded-lg border px-3 py-2 disabled:opacity-50"
                onClick={verifyCode}
                disabled={otp.length !== 6 || busy}
              >
                Verify
              </button>
            </div>
          )}

          {msg && <div className="text-sm text-neutral-700">{msg}</div>}
          <p className="text-xs text-neutral-500 mt-2">
            By continuing, you agree to our minimal cookie usage for auth.
          </p>
        </div>
      </div>
    </div>
  );
}
