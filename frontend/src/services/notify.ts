import { supabase } from '../lib/supabase'

export async function registerDevice(endpoint: string, ua?: string) {
  // upsert on unique push_endpoint
  const { error } = await supabase
    .from('devices')
    .upsert({ push_endpoint: endpoint, ua }, { onConflict: 'push_endpoint' })
  if (error) throw error
  return { ok: true }
}

export async function unregisterDevice(endpoint: string) {
  const { error } = await supabase.from('devices').delete().eq('push_endpoint', endpoint)
  if (error) throw error
  return { ok: true }
}
