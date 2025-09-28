import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Handles both new “code” redirects and hash-based links.
        const url = window.location.href;
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) throw error;

        // Safety: if the above didn’t set a session (older links), try reading it.
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("No session found after callback.");

        navigate("/", { replace: true });
      } catch (e: any) {
        setErr(e?.message ?? "Could not complete sign-in.");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="rounded-2xl border p-6 shadow-sm max-w-md w-full text-center">
        {!err ? (
          <>
            <div className="text-lg font-medium">Signing you in…</div>
            <div className="text-sm text-neutral-500 mt-1">You can close this tab if nothing happens.</div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold">Could not complete sign-in. Please try again.</div>
            <div className="text-xs text-neutral-500 mt-2">{err}</div>
          </>
        )}
      </div>
    </div>
  );
}
