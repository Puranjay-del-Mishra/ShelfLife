import { supabase } from '../lib/supabase'
import type { Counters } from '../types/domain'

export async function getCounters(): Promise<Counters> {
  const today = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('days_left', 0)
  const week = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .gte('days_left', 1)
    .lte('days_left', 7)
  const total = await supabase.from('items').select('*', { count: 'exact', head: true })

  if (today.error || week.error || total.error) {
    throw today.error ?? week.error ?? total.error
  }

  return {
    expiringToday: today.count ?? 0,
    thisWeek: week.count ?? 0,
    total: total.count ?? 0,
  }
}
