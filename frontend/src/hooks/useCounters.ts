import { useQuery } from "@tanstack/react-query";
import { getCounters } from "@/services/stats"; // ⬅️ adjust to "../services/stats" if you don't use "@"

// hooks/useCounters.ts
export function useCounters(opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  return useQuery({
    queryKey: ['counters'],
    queryFn: getCounters,
    enabled, // only runs when enabled is true
  });
}

