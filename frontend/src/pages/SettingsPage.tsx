import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function SettingsPage() {
  const [enabled, setEnabled] = useState(true)
  const [hour, setHour] = useState(9)
  const [min, setMin] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // load from public.users
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      const { data: row } = await supabase.from('users').select('*').eq('id', uid).single()
      if (row) {
        setEnabled(row.notify_enabled ?? true)
        setHour(row.notify_hour ?? 9)
        setMin(row.notify_min ?? 0)
      }
    })
  }, [])

  async function save() {
    setSaving(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    await supabase.from('users').update({
      notify_enabled: enabled, notify_hour: hour, notify_min: min, notify_tz: tz
    }).eq('id', (await supabase.auth.getUser()).data.user!.id)
    setSaving(false)
  }

  return (
    <div className="p-4 max-w-xl">
      <div className="text-xl font-semibold mb-3">Settings</div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>Push notifications</div>
          <input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
        </div>
        <div className="flex items-center gap-2">
          <label>Time</label>
          <select value={hour} onChange={e=>setHour(Number(e.target.value))}>{Array.from({length:24}).map((_,h)=><option key={h} value={h}>{h.toString().padStart(2,'0')}</option>)}</select>
          :
          <select value={min} onChange={e=>setMin(Number(e.target.value))}>{[0,15,30,45].map(m=><option key={m} value={m}>{m.toString().padStart(2,'0')}</option>)}</select>
        </div>
        <div className="flex justify-end">
          <button className="px-3 py-1.5 rounded bg-black text-white" onClick={save} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  )
}
