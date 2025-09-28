// src/components/dashboard/ProduceCard.tsx
import { useEffect, useRef, useState } from 'react'
import { StagePill } from '@/components/common/StagePill'
// import { StatusDot } from '@/components/common/StatusDot' // no longer used
import { StorageChip } from '@/components/common/StorageChip'
import { DaysLeftBadge } from '@/components/common/DaysLeftBadge'
import { QuantityBadge } from '@/components/common/QuantityBadge'
// import { QuantityAdjust } from '@/components/common/QuantityAdjust' // removed per request
import { analyze, deleteItem } from '@/services/items'
import { signedImageUrl } from '@/lib/edge'
import type { Item } from '@/types/domain'
import { AddEditItemSheet } from '@/components/dashboard/AddEditItemSheet' // ✅ your path

// Simple in-memory cache so each path signs once per load.
const signedUrlCache = new Map<string, string>()

function statusPillClass(status: Item['status']) {
  switch (status) {
    case 'ok': return 'bg-green-100 text-green-800 border-green-200'
    case 'spoiling': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'expired': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}
function StatusPill({ status }: { status: Item['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${statusPillClass(status)}`}>
      <span>●</span><span className="capitalize">{status}</span>
    </span>
  )
}

function barColor(pct: number) {
  if (pct > 0.66) return 'bg-green-500'
  if (pct > 0.33) return 'bg-amber-500'
  return 'bg-red-500'
}
function computePct(item: Item) {
  const total = item.initial_days_left ?? null
  const left = item.days_left ?? null
  if (total == null || total <= 0 || left == null) return null
  return Math.max(0, Math.min(1, left / total))
}
function formatAcquired(iso?: string | null) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export function ProduceCard({
  item,
  onUpdatePhoto,
  onChanged,
}: {
  item: Item
  onUpdatePhoto: (id: string) => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const analyzing = !item.last_vlm_at && item.days_left == null

  // Signed image handling
  const [thumb, setThumb] = useState<string | null>(null)
  const [thumbErr, setThumbErr] = useState<string | null>(null)
  const refreshedOnce = useRef(false)

  useEffect(() => {
    let active = true
    setThumb(null)
    setThumbErr(null)

    const path = item.image_path
    if (!path) return

    async function load() {
      try {
        const cached = signedUrlCache.get(path)
        if (cached) { if (active) setThumb(cached); return }
        const url = await signedImageUrl(path, 3600)
        if (!active) return
        signedUrlCache.set(path, url)
        setThumb(url)
      } catch (e: any) {
        if (active) setThumbErr(e?.message ?? 'Failed to load image')
      }
    }

    load()
    return () => { active = false }
  }, [item.image_path])

  async function refreshSignedUrlOnce() {
    if (refreshedOnce.current) return
    refreshedOnce.current = true
    try {
      signedUrlCache.delete(item.image_path)
      const fresh = await signedImageUrl(item.image_path, 3600)
      setThumb(fresh); setThumbErr(null)
    } catch (e: any) {
      setThumbErr(e?.message ?? 'Failed to refresh image')
    }
  }

  const pct = computePct(item)
  const pctRounded = pct != null ? Math.round(pct * 100) : null
  const acquiredChip = formatAcquired(item.acquired_at)

  return (
    <div className="border rounded-xl p-3 relative">
      {/* Top-right status pill */}
      {item.status && (
        <div className="absolute top-2 right-2">
          <StatusPill status={item.status} />
        </div>
      )}

      <div className="relative aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={item.label}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={refreshSignedUrlOnce}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {thumbErr ? 'image unavailable' : 'loading…'}
          </div>
        )}

        {analyzing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            Analyzing…
          </div>
        )}
      </div>

      {/* Title + stage */}
      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{item.label}</div>
        <StagePill stage={item.freshness_stage ?? 'Fresh'} />
      </div>

      {/* Meta row */}
      <div className="text-sm text-gray-600 flex items-center gap-2 mt-0.5">
        {item.store && <span className="truncate max-w-[45%]">{item.store}</span>}
        <StorageChip storage={item.storage} />
        <QuantityBadge item={item} />
      </div>

      {/* Acquired chip (replaces +/- quantity controls) */}
      {acquiredChip && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
            🛒 Acquired {acquiredChip}
          </span>
        </div>
      )}

      {/* Freshness meter */}
      {pct != null && (
        <div className="mt-3">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor(pct)} transition-[width] duration-500`}
              style={{ width: `${pctRounded}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-gray-500">~{pctRounded}% freshness left</div>
        </div>
      )}

      {/* Days left + actions */}
      <div className="flex items-center justify-between mt-3">
        <DaysLeftBadge days={item.days_left} />
        <div className="flex items-center gap-1.5">
          <button
            className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
            onClick={() => setShowEdit(true)}
            title="Edit details"
          >
            ✏️
          </button>

          <button
            className="px-2 py-1 rounded hover:bg-gray-100 text-sm disabled:opacity-60"
            onClick={async () => {
              setBusy(true)
              await analyze(item.id).catch(() => {})
              setBusy(false)
              onChanged()
            }}
            disabled={busy || analyzing}
            title="Re-run analysis"
          >
            ↻
          </button>

          <button
            className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
            onClick={async () => {
              await deleteItem(item.id, item.image_path)
              onChanged()
            }}
            title="Mark done"
          >
            ✔️
          </button>
          <button
            className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
            onClick={async () => {
              await deleteItem(item.id, item.image_path)
              onChanged()
            }}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Inline edit sheet */}
      <AddEditItemSheet
        open={showEdit}
        mode="edit"
        item={item}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); onChanged() }}
      />
    </div>
  )
}
