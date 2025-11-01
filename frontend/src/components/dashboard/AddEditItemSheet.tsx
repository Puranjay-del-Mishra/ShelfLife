// src/components/sheets/AddEditItemSheet.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  createItem,
  setQuantity,
  updateItemFields,
  setDaysLeft,
} from '@/services/items'
import type { Item, Storage } from '@/types/domain'
import { elapsedDays } from '@/lib/date'

type Mode = 'add' | 'edit'

export function AddEditItemSheet({
  open,
  mode = 'add',
  item,
  onClose,
  onSaved,
}: {
  open: boolean
  mode?: Mode
  item?: Item
  onClose: (ctx?: { newItemId?: string }) => void
  onSaved?: () => void
}) {
  // ---- state (stable order) ----
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [store, setStore] = useState('')
  const [storage, setStorage] = useState<Storage>('counter')
  const [acquired, setAcquired] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  // days_left as string so "" = unset
  const [daysLeftStr, setDaysLeftStr] = useState<string>('')
  const [initialDaysLeftStr, setInitialDaysLeftStr] = useState<string>('')

  const [qtyType, setQtyType] =
    useState<'count' | 'weight' | 'volume' | 'bunch' | 'other'>('count')
  const [qtyUnit, setQtyUnit] = useState('ea')
  // keep quantity as string to avoid '' -> 0 coercion
  const [qtyValueStr, setQtyValueStr] = useState<string>('1')

  const [saving, setSaving] = useState(false)

  // ---- prefill/reset ----
  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && item) {
      setName(item.name ?? '')
      setLabel(item.label ?? '')
      setStore(item.store ?? '')
      setStorage(item.storage ?? 'counter')
      setAcquired(item.acquired_at ?? new Date().toISOString().slice(0, 10))

      const initDays = item.days_left == null ? '' : String(item.days_left)
      setInitialDaysLeftStr(initDays)
      setDaysLeftStr(initDays)

      setQtyType(item.qty_type ?? 'count')
      setQtyUnit(item.qty_unit ?? 'ea')
      setQtyValueStr(
        typeof item.qty_value === 'number' && Number.isFinite(item.qty_value)
          ? String(item.qty_value)
          : '1'
      )
    } else {
      setName('')
      setLabel('')
      setStore('')
      setStorage('counter')
      setAcquired(new Date().toISOString().slice(0, 10))
      setInitialDaysLeftStr('')
      setDaysLeftStr('')
      setQtyType('count')
      setQtyUnit('ea')
      setQtyValueStr('1')
    }
  }, [open, mode, item])

  // ---- helpers ----
  const parseDaysOrNull = (s: string): number | null => {
    const t = s.trim()
    if (!t) return null
    const n = Number(t)
    if (!Number.isFinite(n)) return null
    const v = Math.round(n)
    return Math.max(0, Math.min(365, v))
  }

  const parseQtyOrNull = (s: string): number | null => {
    const t = s.trim()
    if (!t) return null // treat blank as "no change / use default on add"
    const n = Number(t)
    if (!Number.isFinite(n)) return null
    // block zero to avoid accidental deletes via DB trigger
    if (n === 0) return null
    return Math.max(0, n)
  }

  const newLabel = label || name || 'Unlabeled'

  // ---- dirty flags ----
  const coreChanged =
    mode === 'edit' && item
      ? (name || '') !== (item.name ?? '') ||
        newLabel !== (item.label ?? '') ||
        (store || '') !== (item.store ?? '') ||
        storage !== (item.storage ?? 'counter') ||
        acquired !== (item.acquired_at ?? '')
      : mode === 'add'

  const daysChanged =
    mode === 'edit' && item
      ? daysLeftStr.trim() !== initialDaysLeftStr.trim()
      : mode === 'add'

  const qtyParsed = parseQtyOrNull(qtyValueStr)
  const qtyChanged =
    mode === 'edit' && item
      ? // only consider changed if user provided a valid value
        qtyParsed != null &&
        (qtyType !== item.qty_type ||
          qtyUnit !== item.qty_unit ||
          qtyParsed !== item.qty_value)
      : // in add mode, seed quantity if user gave a valid value
        mode === 'add' && qtyParsed != null

  const isDirty =
    mode === 'add' ? true : coreChanged || daysChanged || qtyChanged

  // ---- actions ----
  const onSave = useCallback(async () => {
    if (!isDirty) {
      onClose()
      return
    }

    setSaving(true)
    try {
      if (mode === 'add') {
        const days = parseDaysOrNull(daysLeftStr)
        const created = await createItem({
          name: name || 'Unlabeled',
          label: newLabel,
          store: store || null,
          storage,
          acquired_at: acquired,
          days_left: days,
          initial_days_left: days ?? null,
        })

        // Only set quantity if the user provided a valid value
        if (qtyParsed != null) {
          await setQuantity(created.id, {
            qty_type: qtyType,
            qty_unit: qtyUnit,
            qty_value: qtyParsed,
            estimated: false,
          })
        }

        setSaving(false)
        onClose({ newItemId: created.id })
        return
      }

      // edit mode
      if (!item) {
        setSaving(false)
        onClose()
        return
      }

      const acquiredChanged = (item.acquired_at ?? '') !== acquired

      if (coreChanged) {
        await updateItemFields(item.id, {
          name: name || 'Unlabeled',
          label: newLabel,
          store: store || null,
          storage,
          acquired_at: acquired,
        })
      }

      if (daysChanged) {
        await setDaysLeft(item.id, parseDaysOrNull(daysLeftStr))
      } else if (acquiredChanged) {
        // Recompute days_left when Acquired changed but Days left wasn't edited
        const baseLife =
          (item as any).initial_days_left ?? item.days_left ?? null
        if (typeof baseLife === 'number') {
          const recomputed = Math.max(0, baseLife - elapsedDays(acquired))
          await setDaysLeft(item.id, recomputed)
        }
      }

      if (qtyChanged && qtyParsed != null) {
        await setQuantity(item.id, {
          qty_type: qtyType,
          qty_unit: qtyUnit,
          qty_value: qtyParsed,
          estimated: false,
        })
      }

      setSaving(false)
      onSaved?.()
      onClose()
    } catch (e) {
      setSaving(false)
      onClose()
    }
  }, [
    isDirty,
    mode,
    item,
    name,
    newLabel,
    store,
    storage,
    acquired,
    daysLeftStr,
    qtyType,
    qtyUnit,
    qtyParsed,
    onClose,
    onSaved,
    coreChanged,
    daysChanged,
  ])

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[1px] flex justify-center items-end md:items-center p-4"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl p-4 space-y-3 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold">
          {mode === 'add' ? 'Add Produce' : 'Edit Produce'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Name</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Label</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Kirkwood Boneless Chicken Thighs"
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Store/Brand</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Storage</div>
            <select
              className="w-full border rounded px-3 py-2"
              value={storage}
              onChange={(e) => setStorage(e.target.value as Storage)}
            >
              <option value="counter">Counter</option>
              <option value="fridge">Fridge</option>
              <option value="freezer">Freezer</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">Acquired</div>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={acquired}
              onChange={(e) => setAcquired(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-gray-600">
              Days left <span className="text-gray-400">(optional, 0–365)</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              className="w-full border rounded px-3 py-2"
              value={daysLeftStr}
              onChange={(e) => setDaysLeftStr(e.target.value)}
              placeholder="leave blank to unset"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm col-span-1">
            <div className="mb-1 text-gray-600">Qty type</div>
            <select
              className="w-full border rounded px-3 py-2"
              value={qtyType}
              onChange={(e) => setQtyType(e.target.value as any)}
            >
              <option value="count">count</option>
              <option value="weight">weight</option>
              <option value="volume">volume</option>
              <option value="bunch">bunch</option>
              <option value="other">other</option>
            </select>
          </label>
          <label className="text-sm col-span-1">
            <div className="mb-1 text-gray-600">Unit</div>
            <input
              className="w-full border rounded px-3 py-2"
              value={qtyUnit}
              onChange={(e) => setQtyUnit(e.target.value)}
            />
          </label>
          <label className="text-sm col-span-1">
            <div className="mb-1 text-gray-600">Value</div>
            <input
              type="number"
              min={0}
              step="any"
              className="w-full border rounded px-3 py-2"
              value={qtyValueStr}
              onChange={(e) => setQtyValueStr(e.target.value)}
              placeholder="leave blank to keep current"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5" onClick={() => onClose()}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded bg-black text-white disabled:opacity-60"
            disabled={saving || !isDirty}
            onClick={onSave}
            title={isDirty ? 'Save' : 'No changes'}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
