import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useItems } from '@/hooks/useItems'
import { usePush } from '@/hooks/usePush'

type NoticeKind = 'info' | 'warning'
type Notice = {
  id: string
  kind: NoticeKind
  title: string
  body?: string
  itemId?: string | number
  createdAt: number
  read: boolean
}

const LS_NOTICES = 'shelflife:notices:v1'
const LS_NOTIFIED_D1 = 'shelflife:notified:d1'

function loadNotices(): Notice[] {
  try { return JSON.parse(localStorage.getItem(LS_NOTICES) || '[]') } catch { return [] }
}
function saveNotices(ns: Notice[]) {
  try { localStorage.setItem(LS_NOTICES, JSON.stringify(ns)) } catch {}
}
function loadD1(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(LS_NOTIFIED_D1) || '[]')) } catch { return new Set() }
}
function saveD1(s: Set<string>) { try { localStorage.setItem(LS_NOTIFIED_D1, JSON.stringify([...s])) } catch {} }

function nowId() { return crypto.randomUUID?.() ?? String(Date.now() + Math.random()) }

export function NotificationBell() {
  const { supported, subscribed, subscribe } = usePush()

  // Pull soonest items (you can widen pageSize if needed)
  const { data } = useItems({ status: [], stage: [], storage: [], sort: 'days_left_asc', pageSize: 32 })
  const items = data?.items ?? []

  // ≤3 days helper for the list in the popover
  const attention = useMemo(() => items.filter(i => (i.days_left ?? 999) <= 3), [items])

  // Inbox
  const [notices, setNotices] = useState<Notice[]>(() => loadNotices())
  const unread = notices.filter(n => !n.read).length
  useEffect(() => saveNotices(notices), [notices])

  // ---- Add notice helpers ----
  const pushNotice = (n: Omit<Notice, 'id'|'createdAt'|'read'>) =>
    setNotices(prev => [{ id: nowId(), createdAt: Date.now(), read: false, ...n }, ...prev].slice(0, 200))
  const markAll = () => setNotices(prev => prev.map(n => ({ ...n, read: true })))

  // ---- Listen for "new item added" event (emitted after create) ----
  useEffect(() => {
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail
      const name = detail?.name ?? 'Item'
      pushNotice({ kind: 'info', title: `Added "${name}"`, body: 'Item successfully added.', itemId: detail?.id })
    }
    window.addEventListener('item:created', handler as EventListener)
    return () => window.removeEventListener('item:created', handler as EventListener)
  }, [])

  // ---- One-time notification when an item hits 24h left (days_left === 1) ----
  // Re-check at midnight:
  const midnightTick = useRef<number | null>(null)
  useEffect(() => {
    const now = new Date()
    const next = new Date(now); next.setHours(24,0,0,0)
    const toMidnight = next.getTime() - now.getTime()
    const t0 = window.setTimeout(() => {
      // force an effect run by updating a dummy state
      setDummy(x => x + 1)
      midnightTick.current = window.setInterval(() => setDummy(x => x + 1), 86_400_000)
    }, toMidnight)
    return () => { clearTimeout(t0); if (midnightTick.current) clearInterval(midnightTick.current) }
  }, [])
  const [, setDummy] = useState(0)

  useEffect(() => {
    const seen = loadD1()
    for (const it of items) {
      const id = String(it.id)
      const d = it.days_left ?? 999
      if (d === 1 && !seen.has(id)) {
        pushNotice({
          kind: 'warning',
          title: `${it.name ?? 'An item'} expires tomorrow`,
          body: 'Use it soon to avoid waste.',
          itemId: it.id,
        })
        seen.add(id)
      }
      // If user edits date back to >1, allow re-notifying in future
      if (d > 1 && seen.has(id)) seen.delete(id)
    }
    saveD1(seen)
  }, [items])

  // ---- UI ----
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button className="relative p-2 rounded-lg hover:bg-gray-100" onClick={() => setOpen(v => !v)} aria-label="Notifications">
        <span>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-xs bg-red-500 text-white rounded-full px-1">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow p-2 z-[200]">
          {/* Push enable row */}
          {!supported && <div className="p-2 text-sm">Push not supported on this browser.</div>}
          {supported && !subscribed && (
            <div className="p-2 text-sm flex items-center justify-between gap-2">
              <span>Enable push alerts?</span>
              <button className="px-2 py-1 rounded bg-black text-white" onClick={() => subscribe()}>Enable</button>
            </div>
          )}

          {/* Inbox */}
          <div className="border-b px-2 pb-1 mb-2 flex items-center justify-between">
            <div className="font-medium">Notifications</div>
            <button className="text-xs text-blue-600 disabled:text-gray-400" disabled={unread===0} onClick={markAll}>Mark all read</button>
          </div>

          {notices.length === 0 ? (
            <div className="p-2 text-sm text-gray-500">No notifications</div>
          ) : (
            <ul className="divide-y max-h-60 overflow-auto">
              {notices.map(n => (
                <li key={n.id} className="p-2 flex gap-2">
                  <div className={n.kind === 'warning' ? 'text-yellow-600' : 'text-sky-600'}>
                    {n.kind === 'warning' ? '⚠️' : '🆕'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.body && <div className="text-xs text-gray-600">{n.body}</div>}
                    <div className="text-[10px] text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Attention list (≤3d) */}
          <div className="border-t mt-2 pt-2">
            <div className="px-2 text-xs uppercase tracking-wide text-gray-500">Expiring soon</div>
            <div className="max-h-56 overflow-auto">
              {attention.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">No items need attention.</div>
              ) : attention.map(i => (
                <div key={i.id} className="p-2 rounded hover:bg-gray-50 cursor-pointer">
                  <div className="font-medium">{i.name} {i.label ? <span className="text-xs text-gray-500">({i.label})</span> : null}</div>
                  <div className="text-sm text-gray-600">
                    {i.days_left === 0 ? 'Today' : `${i.days_left} day(s) left`} • {i.storage}{i.store ? ` • ${i.store}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
