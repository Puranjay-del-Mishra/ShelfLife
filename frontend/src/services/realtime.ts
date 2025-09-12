import { supabase } from '../lib/supabase'
import type { Item } from '../types/domain'

export function subscribeToItem(itemId: string, onChange: (item: Item) => void) {
  const channel = supabase
    .channel(`items-${itemId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items', filter: `id=eq.${itemId}` },
      (payload) => {
        if (payload.new) onChange(payload.new as Item)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
