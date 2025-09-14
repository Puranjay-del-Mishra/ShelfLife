import { useState } from 'react'
import { StagePill } from '@/components/common/StagePill'
import { StatusDot } from '@/components/common/StatusDot'
import { StorageChip } from '@/components/common/StorageChip'
import { DaysLeftBadge } from '@/components/common/DaysLeftBadge'
import { QuantityBadge } from '@/components/common/QuantityBadge'
import { QuantityAdjust } from '@/components/common/QuantityAdjust'
import { analyze, deleteItem } from '@/services/items'
import type { Item } from '@/types/domain'

export function ProduceCard({ item, onUpdatePhoto, onChanged }:{
  item: Item
  onUpdatePhoto: (id: string)=>void
  onChanged: ()=>void
}) {
  const [busy, setBusy] = useState(false)
  const analyzing = !item.freshness_stage

  return (
    <div className="border rounded-xl p-3 relative">
      {item.status !== 'ok' && <div className="absolute top-2 right-2"><StatusDot status={item.status}/></div>}

      <div className="aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden">
        {/* Thumbnail: use signed URL when you wire it */}
        <div className="w-full h-full flex items-center justify-center text-gray-400">photo</div>
        {analyzing && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">Analyzing…</div>}
      </div>

      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{item.label}</div>
        <StagePill stage={item.freshness_stage ?? 'Fresh'} />
      </div>
      <div className="text-sm text-gray-600 flex items-center gap-2 mt-0.5">
        {item.store && <span>{item.store}</span>}
        <StorageChip storage={item.storage}/>
        <QuantityBadge item={item}/>
      </div>

      <div className="flex items-center justify-between mt-3">
        <DaysLeftBadge days={item.days_left}/>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded hover:bg-gray-100" onClick={() => onUpdatePhoto(item.id)}>📷</button>
          <button className="p-2 rounded hover:bg-gray-100" onClick={async() => { setBusy(true); await analyze(item.id).catch(()=>{}); setBusy(false)}} disabled={busy || analyzing}>↻</button>
          <button className="p-2 rounded hover:bg-gray-100" onClick={async()=>{ await deleteItem(item.id); onChanged() }}>✔️</button>
          <button className="p-2 rounded hover:bg-gray-100" onClick={async()=>{ await deleteItem(item.id); onChanged() }}>🗑️</button>
        </div>
      </div>

      <QuantityAdjust itemId={item.id} onChanged={onChanged}/>
    </div>
  )
}
