// auto-stub created
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listItems } from '@/services/items'
export type UseItemsParams  = Parameters<typeof listItems>[0]
export type UseItemsResult  = Awaited<ReturnType<typeof listItems>>
export function useItems(params: UseItemsParams) {
  return useQuery<UseItemsResult, Error>({
    queryKey: ['items', params],
    queryFn: () => listItems(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
