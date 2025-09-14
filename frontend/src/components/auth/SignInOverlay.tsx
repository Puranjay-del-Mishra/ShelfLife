import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function SignInOverlay() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // resend cooldown (60s)
  const RESEND_MS = 60_000;
  const key = useMemo(() => `sl_last_send_${email}`, [email]);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    const last = +localStorage.getItem(key)! || 0;
    const left = Math.max(0, RESEND_MS - (Date.now() - last));
    setCooldown(left);
    const id = setInterval(() => {
      const t = +localStorage.getItem(key)! || 0;
      setCooldown(Math.max(0, RESEND_MS - (Date.now() - t)));
    }, 250);
    return () => clearInterval(id);
  }, [key]);

  if (session) return null;

  async function sendCode() {
    if (!email || cooldown > 0) return;
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }, // OTP email (will also contain a link; we ignore it)
      });
      if (error) throw error;
      setSent(true);
      localStorage.setItem(key, String(Date.now()));
      setMsg("We sent a 6-digit code to your email.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!email || otp.length !== 6) return;
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
      if (error) throw error;
      setMsg("Signed in!");
      // session will update -> overlay hides
    } catch (e: any) {
      setMsg(e?.message ?? "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  const cooldownSec = Math.ceil(cooldown / 1000);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-semibold">Welcome to ShelfLife</h1>
        <p className="text-sm text-neutral-600 mt-1">Sign in or sign up with a one-time code.</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-sm text-neutral-600">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded-lg bg-neutral-900 text-white px-4 py-2 disabled:opacity-50"
              onClick={sendCode}
              disabled={!email || busy || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldownSec}s` : "Send code"}
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
          <p className="text-xs text-neutral-500 mt-2">By continuing, you agree to our minimal cookie usage for auth.</p>
        </div>
      </div>
    </div>
  );
}
