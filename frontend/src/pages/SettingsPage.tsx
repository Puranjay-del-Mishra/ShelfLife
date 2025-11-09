// src/pages/SettingsPage.tsx
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/AuthProvider";
import { backend } from "@/lib/backend";

import { AccountSection } from "@/components/settings/AccountSection";
import { DefaultsSection } from "@/components/settings/DefaultsSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { DataSection } from "@/components/settings/DataSection";
import { PrivacySection } from "@/components/settings/PrivacySection";

import type { UserSettings } from "@/components/settings/types";

const FALLBACK_SETTINGS: UserSettings = {
  notify_local_time: "09:00:00",
  timezone: "America/New_York",
  notify_days_before: [3, 1, 0],
  push_enabled: true,
};

export function SettingsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await backend.getSettings();
      return {
        notify_local_time: res.notify_local_time,
        timezone: res.timezone,
        notify_days_before: res.notify_days_before,
        push_enabled: res.push_enabled,
      };
    },
    enabled: !!session,
  });

  const settings: UserSettings = useMemo(
    () => data ?? FALLBACK_SETTINGS,
    [data]
  );

  const saveMutation = useMutation({
    mutationFn: async (next: UserSettings) =>
      backend.updateSettings({
        notify_local_time: next.notify_local_time,
        timezone: next.timezone,
        notify_days_before: next.notify_days_before,
        push_enabled: next.push_enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const patch = (p: Partial<UserSettings>) =>
    queryClient.setQueryData<UserSettings>(
      ["settings"],
      (prev) => ({
        ...(prev ?? FALLBACK_SETTINGS),
        ...p,
      })
    );

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Please sign in to manage your preferences.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-neutral-500">
            Control how ShelfLife behaves for your account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate(settings)}
          disabled={saveMutation.isPending || isLoading}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save changes"}
        </button>
      </div>

      {isLoading && !data ? (
        <div className="text-sm text-neutral-500">Loading your settings…</div>
      ) : (
        <>
          <AccountSection />
          <DefaultsSection settings={settings} onChange={patch} />
          <NotificationsSection settings={settings} onChange={patch} />
          <DataSection settings={settings} />
          <PrivacySection />
        </>
      )}
    </div>
  );
}
