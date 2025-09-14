import { useState } from 'react'
import { createItem, setQuantity } from '@/services/items'
import type { Storage } from '@/types/domain'

export function AddEditItemSheet({ open, onClose }:{
  open: boolean,
  onClose: (ctx?: { newItemId?: string }) => void
}) {
  const [name, setName] = useState('')
  const [store, setStore] = useState('')
  const [storage, setStorage] = useState<Storage>('counter')
  const [acquired, setAcquired] = useState(() => new Date().toISOString().slice(0,10))
  const [qtyType, setQtyType] = useState<'count'|'weight'|'volume'|'bunch'|'other'>('count')
  const [qtyUnit, setQtyUnit] = useState('ea')
  const [qtyValue, setQtyValue] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-end md:items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-4 space-y-3">
        <div className="text-lg font-semibold">Add Produce</div>

        {/* fields … name, store, storage, acquired, qtyType+unit+value … */}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5" onClick={()=>onClose()}>Cancel</button>
          <button
            className="px-3 py-1.5 rounded bg-black text-white"
            disabled={saving}
            onClick={async ()=>{
              setSaving(true)
              const item = await createItem({ name, store, storage, acquired_at: acquired })
              await setQuantity(item.id, { qty_type: qtyType, qty_unit: qtyUnit, qty_value: qtyValue, estimated: false })
              setSaving(false)
              onClose({ newItemId: item.id }) // triggers UpdatePhotoSheet next
            }}
          >Save</button>
        </div>
      </div>
    </div>
  )
}
