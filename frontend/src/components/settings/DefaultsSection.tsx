import type { UserSettings } from "./types";

type Props = {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
};

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
];

export function DefaultsSection({ settings, onChange }: Props) {
  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-lg font-semibold">Notification defaults</h2>
        <p className="text-sm text-neutral-500">
          When and where we calculate your reminder schedule.
        </p>
      </header>

      <div className="mt-2 grid gap-3 rounded-xl border bg-white p-4 shadow-sm md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-neutral-600">
            Daily reminder time
          </label>
          <input
            type="time"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={settings.notify_local_time.slice(0, 5) || "09:00"}
            onChange={(e) =>
              onChange({ notify_local_time: `${e.target.value}:00` })
            }
          />
          <p className="mt-1 text-xs text-neutral-400">
            Local time used when computing expiring-item notifications.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600">
            Timezone
          </label>
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-white"
            value={settings.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
            {!COMMON_TIMEZONES.includes(settings.timezone) && (
              <option value={settings.timezone}>{settings.timezone}</option>
            )}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Used server-side; must be a valid IANA timezone.
          </p>
        </div>
      </div>
    </section>
  );
}
