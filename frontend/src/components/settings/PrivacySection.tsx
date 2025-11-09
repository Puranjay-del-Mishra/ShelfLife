export function PrivacySection() {
  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-lg font-semibold">Privacy</h2>
        <p className="text-sm text-neutral-500">
          How ShelfLife uses your data.
        </p>
      </header>

      <div className="mt-2 space-y-2 rounded-xl border bg-white p-4 text-xs text-neutral-600 shadow-sm">
        <p>
          • Authentication is handled by Supabase; we never see your password.
        </p>
        <p>
          • Item data is stored in your project&apos;s database; it&apos;s only
          used to compute freshness and notifications.
        </p>
        <p>
          • Push subscriptions are tied to your account so we can send relevant
          reminders; you can revoke them anytime via your browser settings.
        </p>
        <p>
          • No third-party ad trackers. Telemetry can be added later, but will
          be opt-in.
        </p>
      </div>
    </section>
  );
}
