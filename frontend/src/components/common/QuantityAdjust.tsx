import { adjustQuantity, getItemById } from '@/services/items'
import { QUICK_STEPS } from '@/constants/units'

export function QuantityAdjust({ itemId, onChanged }:{ itemId: string, onChanged: ()=>void }) {
  // lightweight fetch to know type & pick steps; in practice you already have item on the card
  // here we just show generic buttons:
  const buttons = [-1, +1, -50, +50] // fallback

  async function click(delta: number) {
    const res = await adjustQuantity(itemId, { delta })
    onChanged()
  }

  return (
    <div className="mt-3 flex gap-1">
      {buttons.map(v =>
        <button key={v} className="px-2 py-1 rounded bg-gray-100 text-sm" onClick={()=>click(v)}>
          {v>0?`+${v}`:v}
        </button>
      )}
    </div>
  )
}
