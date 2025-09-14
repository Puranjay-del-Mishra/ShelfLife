import type { Storage } from '@/types/domain'

export function StorageChip({ storage }: { storage: Storage }) {
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-100 capitalize">{storage}</span>
}
