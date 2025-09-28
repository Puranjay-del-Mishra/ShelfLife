import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listItems } from '@/services/items'

// Reuse the service's param + return types so they never drift
export type UseItemsParams  = Parameters<typeof listItems>[0]
export type UseItemsResult  = Awaited<ReturnType<typeof listItems>>

export function useItems(params: UseItemsParams) {
  // NOTE: make sure `params` object is stable between renders,
  // or memoize it where you build it (useMemo), to avoid refetch spam.
  return useQuery<UseItemsResult, Error>({
    queryKey: ['items', params],
    queryFn: () => listItems(params),
    staleTime: 30_000,
    // v5 replacement for keepPreviousData option:
    placeholderData: keepPreviousData,
  })
}
