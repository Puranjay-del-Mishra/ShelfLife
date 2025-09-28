import { useEffect, useMemo, useState } from 'react'
import { useItems } from '@/hooks/useItems'
import { usePush } from '@/hooks/usePush'

export function NotificationBell() {
  const { supported, subscribed, subscribe } = usePush()
  // pull a tiny “attention” subset: <= 3 days
  const { data } = useItems({ status: [], stage: [], storage: [], sort: 'days_left_asc', pageSize: 8 })
  const attention = useMemo(() => (data?.items ?? []).filter(i => (i.days_left ?? 999) <= 3), [data])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // could also stash “lastSeen” in localStorage to show a dot for new items
  }, [attention])

  return (
    <div className="relative">
      <button className="relative p-2 rounded-lg hover:bg-gray-100" onClick={() => setOpen(v => !v)} aria-label="Notifications">
        <span>🔔</span>
        {attention.length > 0 && <span className="absolute -top-0.5 -right-0.5 text-xs bg-red-500 text-white rounded-full px-1">{attention.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow p-2">
          {!supported && <div className="p-2 text-sm">Push not supported on this browser.</div>}
          {supported && !subscribed && (
            <div className="p-2 text-sm flex items-center justify-between gap-2">
              <span>Enable push alerts?</span>
              <button className="px-2 py-1 rounded bg-black text-white" onClick={() => subscribe()}>Enable</button>
            </div>
          )}
          <div className="max-h-80 overflow-auto">
            {attention.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No items need attention.</div>
            ) : attention.map(i => (
              <div key={i.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer">
                <div className="font-medium">{i.name} <span className="text-xs text-gray-500">({i.label})</span></div>
                <div className="text-sm text-gray-600">
                  {i.days_left === 0 ? 'Today' : `${i.days_left} day(s) left`} • {i.storage}{i.store ? ` • ${i.store}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
