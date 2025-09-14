import React from "react";
import { useCounters } from "@/hooks/useCounters";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const Pill = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl border p-4 md:p-5 shadow-sm">
    <div className="text-sm text-neutral-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
  </div>
);

function SkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border p-4 md:p-5 animate-pulse">
          <div className="h-3 w-24 bg-neutral-200 rounded" />
          <div className="mt-2 h-6 w-16 bg-neutral-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export const StatsStrip: React.FC = () => {
  const { session, loading: authLoading } = useAuthGuard();

  // Only fetch when we have a session; prevents 403s pre-auth
  const { data, isLoading, error } = useCounters({ enabled: !!session });

  // Keep layout steady while auth or data loads
  if (authLoading || !session || isLoading) {
    return <SkeletonRow />;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border p-4 md:p-5 text-red-600">
        Couldn’t load stats.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Pill label="Expiring today" value={data.expiringToday ?? 0} />
      <Pill label="This week" value={data.thisWeek ?? 0} />
      <Pill label="Total items" value={data.total ?? 0} />
    </div>
  );
};
