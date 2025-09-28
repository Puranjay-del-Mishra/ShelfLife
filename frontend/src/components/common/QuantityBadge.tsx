import type { Item } from '@/types/domain'

export function QuantityBadge({ item }:{ item: Item }) {
  const label = `${item.qty_value} ${item.qty_unit}`
  const pct = item.initial_qty_base && item.qty_base
    ? Math.max(0, Math.min(1, item.qty_base / item.initial_qty_base))
    : null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{label}</span>
      {pct !== null && (
        <div className="w-16 h-1 bg-gray-200 rounded">
          <div className="h-1 bg-black rounded" style={{ width: `${pct*100}%` }}/>
        </div>
      )}
    </div>
  )
}
