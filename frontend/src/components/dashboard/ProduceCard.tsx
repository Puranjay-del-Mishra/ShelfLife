// src/components/dashboard/ProduceCard.tsx
import { useEffect, useRef, useState } from 'react'
import { StagePill } from '@/components/common/StagePill'
import { StatusDot } from '@/components/common/StatusDot'
import { StorageChip } from '@/components/common/StorageChip'
import { DaysLeftBadge } from '@/components/common/DaysLeftBadge'
import { QuantityBadge } from '@/components/common/QuantityBadge'
import { QuantityAdjust } from '@/components/common/QuantityAdjust'
import { analyze, deleteItem } from '@/services/items'
import { signedImageUrl } from '@/lib/edge'
import type { Item } from '@/types/domain'

// Simple in-memory cache so each path signs once per load.
const signedUrlCache = new Map<string, string>()

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

  // Consider analysis “in progress” until the backend stamps last_vlm_at and days_left.
  const analyzing = !item.last_vlm_at && item.days_left == null

  // Signed image handling
  const [thumb, setThumb] = useState<string | null>(null)
  const [thumbErr, setThumbErr] = useState<string | null>(null)
  const refreshedOnce = useRef(false)

  // Fetch (or reuse) a signed URL for this item's image_path
  useEffect(() => {
    let active = true
    setThumb(null)
    setThumbErr(null)

    const path = item.image_path
    if (!path) return

    async function load() {
      try {
        // Use cached URL if available
        const cached = signedUrlCache.get(path)
        if (cached) {
          if (active) setThumb(cached)
          return
        }
        const url = await signedImageUrl(path, 3600) // 1h URL
        if (!active) return
        signedUrlCache.set(path, url)
        setThumb(url)
      } catch (e: any) {
        if (active) setThumbErr(e?.message ?? 'Failed to load image')
      }
    }

    load()
    return () => {
      active = false
    }
  }, [item.image_path])

  // If the signed URL expires or hits a 403 on the <img>, refresh once
  async function refreshSignedUrlOnce() {
    if (refreshedOnce.current) return
    refreshedOnce.current = true
    try {
      signedUrlCache.delete(item.image_path)
      const fresh = await signedImageUrl(item.image_path, 3600)
      setThumb(fresh)
      setThumbErr(null)
    } catch (e: any) {
      setThumbErr(e?.message ?? 'Failed to refresh image')
    }
  }

  return (
    <div className="border rounded-xl p-3 relative">
      {item.status !== 'ok' && (
        <div className="absolute top-2 right-2">
          <StatusDot status={item.status} />
        </div>
      )}

      <div className="relative aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden">
        {/* Image (signed URL) */}
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

      <div className="flex items-center justify-between">
        <div className="font-medium truncate">{item.label}</div>
        <StagePill stage={item.freshness_stage ?? 'Fresh'} />
      </div>

      <div className="text-sm text-gray-600 flex items-center gap-2 mt-0.5">
        {item.store && <span>{item.store}</span>}
        <StorageChip storage={item.storage} />
        <QuantityBadge item={item} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <DaysLeftBadge days={item.days_left} />
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={() => onUpdatePhoto(item.id)}
            title="Update photo"
          >
            📷
          </button>

          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={async () => {
              setBusy(true)
              await analyze(item.id).catch(() => {})
              setBusy(false)
            }}
            disabled={busy || analyzing}
            title="Re-run analysis"
          >
            ↻
          </button>

          {/* You have two destructive buttons; keep both if they mean different things,
              otherwise remove one. */}
          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={async () => {
              await deleteItem(item.id, item.image_path)
              onChanged()
            }}
            title="Mark done"
          >
            ✔️
          </button>
          <button
            className="p-2 rounded hover:bg-gray-100"
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

      <QuantityAdjust itemId={item.id} onChanged={onChanged} />
    </div>
  )
}
