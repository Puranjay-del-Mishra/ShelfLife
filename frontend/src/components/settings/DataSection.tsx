import type { UserSettings } from "./types";

type Props = {
  settings: UserSettings; // currently unused, but kept for symmetry/extensibility
};

export function DataSection(_props: Props) {
  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-lg font-semibold">Data</h2>
        <p className="text-sm text-neutral-500">
          Manage your stored items and preferences.
        </p>
      </header>

      <div className="mt-2 space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-neutral-700">
              Export data (coming soon)
            </div>
            <div className="text-xs text-neutral-400">
              Download a JSON export of your items & notifications.
            </div>
          </div>
          <button
            type="button"
            disabled
            className="rounded-lg border px-3 py-1.5 text-xs text-neutral-400 cursor-not-allowed"
          >
            Export
          </button>
        </div>

        <div className="border-t pt-3">
          <div className="text-xs font-medium text-red-600">
            Delete all items (coming soon)
          </div>
          <p className="text-xs text-neutral-400">
            This will remove all tracked items and scheduled notifications for
            your account.
          </p>
          <button
            type="button"
            disabled
            className="mt-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-300 cursor-not-allowed"
          >
            Delete all data
          </button>
        </div>
      </div>
    </section>
  );
}
