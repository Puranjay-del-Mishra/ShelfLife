import { useQuery } from "@tanstack/react-query";
import { getCounters } from "@/services/stats"; // ⬅️ adjust to "../services/stats" if you don't use "@"

export function useCounters() {
  return useQuery({
    queryKey: ["counters"],
    queryFn: getCounters,
    staleTime: 60_000,            // cache for 1 min
    refetchOnWindowFocus: false,  // avoid spammy refetches
  });
}
