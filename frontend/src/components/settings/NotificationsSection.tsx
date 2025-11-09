import type { UserSettings } from "./types";

type Props = {
  settings: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
};

const PRESETS: number[][] = [
  [3, 1, 0],
  [2, 0],
  [1, 0],
  [0],
];

export function NotificationsSection({ settings, onChange }: Props) {
  const { notify_days_before, push_enabled } = settings;

  const toggleDay = (day: number) => {
    const set = new Set(notify_days_before);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    const next = Array.from(set).sort((a, b) => a - b);
    onChange({ notify_days_before: next });
  };

  const usePreset = (preset: number[]) => {
    onChange({ notify_days_before: preset });
  };

  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-neutral-500">
          Choose how early we warn you before items expire.
        </p>
      </header>

      <div className="mt-2 space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs font-medium text-neutral-600 mb-1">
            Reminder offsets
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 5, 7].map((d) => {
              const active = notify_days_before.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {d === 0 ? "On expiry day" : `${d}d before`}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-neutral-400">
            <span>Presets:</span>
            {PRESETS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => usePreset(p)}
                className="underline-offset-2 hover:underline"
              >
                {`[${p.join(", ")}]`}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-3 mt-1 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-neutral-600">
              Push notifications
            </div>
            <div className="text-xs text-neutral-400">
              Enable browser push on supported devices.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ push_enabled: !push_enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              push_enabled ? "bg-neutral-900" : "bg-neutral-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                push_enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
